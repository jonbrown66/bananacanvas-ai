import React, { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Message } from '../types';
import { Icons } from './Icons';
import { CanvasNode } from './workspace/CanvasNode';
import { ConnectionsLayer } from './workspace/ConnectionsLayer';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { reportClientMetric } from '@/lib/perf/client-metrics';
import { parseImageDataUrl, resizeImageDataUrl, type ImageMimeType } from '@/services/geminiService';

interface CanvasWorkspaceProps {
  messages: Message[];
  onSendMessage: (text: string, currentImageBase64?: string, aspectRatio?: any, parentId?: string, isContextImage?: boolean, imageMimeType?: ImageMimeType) => void | Promise<void>;
  onUpdateNodePosition: (id: string, pos: { x: number, y: number }) => void | Promise<void>;
  onAutoLayout: (positions: Record<string, { x: number, y: number }>) => void | Promise<void>;
  isProcessing: boolean;
  onDeleteMessage: (id: string, anchor?: { x: number; y: number }) => void | Promise<void>;
  onRegenerateMessage: (msg: Message) => void;
  statusMessage?: string;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  messages,
  onSendMessage,
  onUpdateNodePosition,
  onAutoLayout,
  isProcessing,
  onDeleteMessage,
  onRegenerateMessage,
  statusMessage
}) => {
  const t = useTranslations('Canvas');
  const tChat = useTranslations('Chat'); // Reuse some keys like Download/Delete
  const locale = useLocale();
  const isChinese = locale === 'zh-CN';
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);

  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [dragViewportTick, setDragViewportTick] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fastPosition = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(scale);
  const canvasClickStart = useRef<{ x: number; y: number } | null>(null);
  const isDraggingCanvasRef = useRef(false);
  const draggingNodeIdRef = useRef<string | null>(null);
  const canvasDragStartRef = useRef({ x: 0, y: 0 });
  const nodeDragOffsetRef = useRef({ x: 0, y: 0 });

  // Store references to HTML elements directly, enabling 60fps fast translation updates without React re-renders.
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Introduce a mutable map for fast coordinates retrieval inside ConnectionsLayer
  const fastNodePositions = useRef<Record<string, { x: number, y: number }>>({});

  // Prevent browser native zoom (Ctrl + scroll)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault(); // Stop entire page from zooming
      }
    };

    // Must use passive: false to allow e.preventDefault()
    container.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleNativeWheel);
  }, []);

  useEffect(() => {
    fastPosition.current = position;
  }, [position]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    // When messages change, ensure fastNodePositions is synchronized.
    const positions: Record<string, { x: number, y: number }> = {};
    messages.forEach(m => {
      // Use existing fast local coord if dragging, otherwise strict DB position
      if (fastNodePositions.current[m.id] && m.id === draggingNodeId) {
        positions[m.id] = fastNodePositions.current[m.id];
      } else if (m.position) {
        positions[m.id] = m.position;
      }
    });
    fastNodePositions.current = positions;
  }, [messages, draggingNodeId]);

  const lastFocusedFirstMsgId = useRef<string | null>(null);
  const isLargeScene = messages.length >= 140;
  const shouldTrackDragViewport = isLargeScene && (isDraggingCanvas || !!draggingNodeId);

  useEffect(() => {
    if (!shouldTrackDragViewport) return;

    let rafId: number | null = null;
    let lastSampleAt = 0;

    const loop = (now: number) => {
      if (now - lastSampleAt >= 33) {
        setDragViewportTick((tick) => (tick + 1) % 10_000);
        lastSampleAt = now;
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [shouldTrackDragViewport]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setContainerSize((prev) => {
        const next = { width: Math.round(rect.width), height: Math.round(rect.height) };
        if (next.width === prev.width && next.height === prev.height) return prev;
        return next;
      });
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    let rafId: number | null = null;
    let startAt = performance.now();
    let lastTs = startAt;
    let frames = 0;
    let droppedFrames = 0;
    const SAMPLE_WINDOW_MS = 5000;

    const loop = (now: number) => {
      if (document.hidden) {
        lastTs = now;
        rafId = requestAnimationFrame(loop);
        return;
      }

      const delta = now - lastTs;
      if (delta > 18) {
        droppedFrames += Math.max(0, Math.round(delta / 16.67) - 1);
      }

      frames += 1;
      if (now - startAt >= SAMPLE_WINDOW_MS) {
        const duration = Math.max(now - startAt, 1);
        const fps = (frames * 1000) / duration;
        reportClientMetric({
          name: 'canvas_fps',
          value: Number(fps.toFixed(2)),
          unit: 'fps',
          tags: {
            messages: messages.length,
            dropped_frames: droppedFrames,
            scale: Number(scaleRef.current.toFixed(2))
          }
        });

        reportClientMetric({
          name: 'canvas_dropped_frames',
          value: droppedFrames,
          unit: 'count',
          tags: {
            messages: messages.length
          }
        });

        startAt = now;
        frames = 0;
        droppedFrames = 0;
      }

      lastTs = now;
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [messages.length]);

  // Initial focus: on first load or project switch, select the last node and pan the canvas to center it
  useEffect(() => {
    if (messages.length === 0 || !containerRef.current) return;

    // Detect project switch by checking if the first message ID changed
    const firstMsgId = messages[0].id;
    if (lastFocusedFirstMsgId.current === firstMsgId) return;

    lastFocusedFirstMsgId.current = firstMsgId;
    const lastMsg = messages[messages.length - 1];
    setSelectedNodeId(lastMsg.id);

    // Pan the canvas so the last node is centered in the viewport
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const nodePos = lastMsg.position || { x: 0, y: 0 };
    const nodeWidth = 380;
    const nodeHeight = 350;

    const targetX = rect.width / 2 - (nodePos.x + nodeWidth / 2) * scale;
    const targetY = rect.height / 2 - (nodePos.y + nodeHeight / 2) * scale;

    setPosition({ x: targetX, y: targetY });
    fastPosition.current = { x: targetX, y: targetY };
  }, [messages]);

  // Auto-focus: when a placeholder node appears, select it and smoothly pan the canvas to center it
  useEffect(() => {
    const placeholder = messages.find(m => m.isPlaceholder);
    if (!placeholder || !containerRef.current) return;

    // Select the placeholder node
    setSelectedNodeId(placeholder.id);

    // Pan the canvas so the placeholder is roughly centered in the viewport
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const nodePos = placeholder.position || { x: 0, y: 0 };
    const nodeWidth = 380;
    const nodeHeight = 350; // approximate skeleton height

    const targetX = rect.width / 2 - (nodePos.x + nodeWidth / 2) * scale;
    const targetY = rect.height / 2 - (nodePos.y + nodeHeight / 2) * scale;

    // Apply smooth CSS transition then update position
    if (contentRef.current) {
      contentRef.current.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
    }
    if (bgRef.current) {
      bgRef.current.style.transition = 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
    }

    setPosition({ x: targetX, y: targetY });
    fastPosition.current = { x: targetX, y: targetY };

    // Remove transition after animation completes so dragging stays instant
    const timer = setTimeout(() => {
      if (contentRef.current) contentRef.current.style.transition = '';
      if (bgRef.current) bgRef.current.style.transition = '';
    }, 650);

    return () => clearTimeout(timer);
  }, [messages.find(m => m.isPlaceholder)?.id]);


  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const getEffectivePosition = (msg: Message) => {
    return fastNodePositions.current[msg.id] || msg.position || { x: 0, y: 0 };
  };

  const viewportBounds = React.useMemo(() => {
    if (!containerSize.width || !containerSize.height) return null;
    const activePosition = shouldTrackDragViewport ? fastPosition.current : position;
    const activeScale = shouldTrackDragViewport ? scaleRef.current : scale;

    return {
      left: (-activePosition.x) / activeScale,
      top: (-activePosition.y) / activeScale,
      right: (containerSize.width - activePosition.x) / activeScale,
      bottom: (containerSize.height - activePosition.y) / activeScale
    };
  }, [containerSize.height, containerSize.width, position.x, position.y, scale, shouldTrackDragViewport, dragViewportTick]);

  const shouldCull = !!viewportBounds && (!isDraggingCanvas && !draggingNodeId || isLargeScene);

  const renderedMessages = React.useMemo(() => {
    if (!viewportBounds || !shouldCull) return messages;

    const NODE_WIDTH = 380;
    const NODE_EST_HEIGHT = 460;
    const margin = isLargeScene ? 180 : 240;

    const intersectsViewport = (x: number, y: number) =>
      x + NODE_WIDTH >= viewportBounds.left - margin &&
      x <= viewportBounds.right + margin &&
      y + NODE_EST_HEIGHT >= viewportBounds.top - margin &&
      y <= viewportBounds.bottom + margin;

    return messages.filter((msg) => {
      if (msg.isPlaceholder) return true;
      const pos = fastNodePositions.current[msg.id] || msg.position || { x: 0, y: 0 };
      return intersectsViewport(pos.x, pos.y);
    });
  }, [messages, shouldCull, viewportBounds, isLargeScene]);

  const lowDetailMode = scale < 0.62 || (isLargeScene && (isDraggingCanvas || !!draggingNodeId || renderedMessages.length > 42));
  const simplifyConnections = isLargeScene && (scale < 0.75 || renderedMessages.length > 56);
  const maxRenderedConnections = React.useMemo(() => {
    if (messages.length > 420 || scale < 0.45) return draggingNodeId ? 110 : 160;
    if (messages.length > 260 || scale < 0.65) return draggingNodeId ? 170 : 240;
    if (messages.length > 140) return draggingNodeId ? 240 : 320;
    return 500;
  }, [messages.length, scale, draggingNodeId]);

  const selectedMessage = messages.find(m => m.id === selectedNodeId);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY === 0 || !containerRef.current) return;

    const zoomFactor = 1.15;
    const isZoomIn = e.deltaY < 0;
    const factor = isZoomIn ? zoomFactor : 1 / zoomFactor;

    const rect = containerRef.current.getBoundingClientRect();

    // Mouse position relative to the container
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Current canvas coordinates under the mouse
    const canvasX = (mouseX - fastPosition.current.x) / scale;
    const canvasY = (mouseY - fastPosition.current.y) / scale;

    const newScale = Math.min(Math.max(0.1, scale * factor), 4);

    // New translation to keep (canvasX, canvasY) under (mouseX, mouseY)
    const newX = mouseX - canvasX * newScale;
    const newY = mouseY - canvasY * newScale;

    setScale(newScale);
    setPosition({ x: newX, y: newY });
    fastPosition.current = { x: newX, y: newY };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-interactive')) return;

    setIsDraggingCanvas(true);
    const nextStart = { x: e.clientX - fastPosition.current.x, y: e.clientY - fastPosition.current.y };
    isDraggingCanvasRef.current = true;
    canvasDragStartRef.current = nextStart;
    canvasClickStart.current = { x: e.clientX, y: e.clientY };
  };

  const downloadImage = React.useCallback((url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleNodeMouseDown = React.useCallback((e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    const msg = messagesRef.current.find(m => m.id === msgId);
    if (!msg) return;

    setSelectedNodeId(msgId);
    setDraggingNodeId(msgId);

    const pos = fastNodePositions.current[msgId] || msg.position || { x: 0, y: 0 };
    const nextOffset = {
      x: e.clientX / scale - pos.x,
      y: e.clientY / scale - pos.y
    };

    draggingNodeIdRef.current = msgId;
    nodeDragOffsetRef.current = nextOffset;
  }, [scale]);

  const handleNodeDownload = React.useCallback((e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    downloadImage(url);
  }, [downloadImage]);

  const handleNodeRegenerate = React.useCallback((e: React.MouseEvent, msg: Message) => {
    e.stopPropagation();
    onRegenerateMessage(msg);
  }, [onRegenerateMessage]);

  const handleNodeDelete = React.useCallback((e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    onDeleteMessage(msgId, { x: e.clientX, y: e.clientY });
  }, [onDeleteMessage]);

  const applyDragMove = React.useCallback((clientX: number, clientY: number) => {
    if (isDraggingCanvasRef.current) {
      const newX = clientX - canvasDragStartRef.current.x;
      const newY = clientY - canvasDragStartRef.current.y;

      fastPosition.current = { x: newX, y: newY };

      if (contentRef.current) {
        contentRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${scaleRef.current})`;
      }
      if (bgRef.current) {
        bgRef.current.style.transform = `translate(${newX % (20 * scaleRef.current)}px, ${newY % (20 * scaleRef.current)}px)`;
      }
    } else if (draggingNodeIdRef.current) {
      // Use DOM transform directly for high-frequency dragging to avoid React re-renders
      const newX = clientX / scaleRef.current - nodeDragOffsetRef.current.x;
      const newY = clientY / scaleRef.current - nodeDragOffsetRef.current.y;

      const activeNodeId = draggingNodeIdRef.current;
      const nodeEl = activeNodeId ? nodeRefs.current[activeNodeId] : null;
      if (nodeEl) {
        nodeEl.style.transform = `translate(${newX}px, ${newY}px)`;
      }

      // Update mutable ref rather than react state to skip massive re-renders
      if (activeNodeId) {
        fastNodePositions.current[activeNodeId] = { x: newX, y: newY };
      }
    }
  }, []);

  const applyDragEnd = React.useCallback((clientX: number, clientY: number) => {
    const activeNodeId = draggingNodeIdRef.current;
    const wasDraggingCanvas = isDraggingCanvasRef.current;

    if (!activeNodeId && !wasDraggingCanvas) return;

    if (wasDraggingCanvas) {
      setPosition(fastPosition.current);
      // Only deselect on a pure click (no significant movement), not on drag/pan
      if (canvasClickStart.current) {
        const dx = clientX - canvasClickStart.current.x;
        const dy = clientY - canvasClickStart.current.y;
        if (dx * dx + dy * dy < 25) {
          setSelectedNodeId(null);
        }
      }
      canvasClickStart.current = null;
    }

    if (activeNodeId && fastNodePositions.current[activeNodeId]) {
      onUpdateNodePosition(activeNodeId, fastNodePositions.current[activeNodeId]);
    }

    isDraggingCanvasRef.current = false;
    draggingNodeIdRef.current = null;
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  }, [onUpdateNodePosition]);

  const handleMouseMove = (e: React.MouseEvent) => {
    applyDragMove(e.clientX, e.clientY);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    applyDragEnd(e.clientX, e.clientY);
  };

  useEffect(() => {
    if (!isDraggingCanvas && !draggingNodeId) return;

    const handleWindowMouseMove = (e: MouseEvent) => applyDragMove(e.clientX, e.clientY);
    const handleWindowMouseUp = (e: MouseEvent) => applyDragEnd(e.clientX, e.clientY);
    const handleWindowBlur = () => applyDragEnd(Number.NaN, Number.NaN);

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isDraggingCanvas, draggingNodeId, applyDragMove, applyDragEnd]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawDataUrl = reader.result as string;
        const optimizedDataUrl = await resizeImageDataUrl(rawDataUrl);
        setUploadedImage(optimizedDataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const clearUpload = () => {
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFloatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isProcessing) return;

    // Priority: Uploaded Image > Selected Node Image
    const imageToUse = uploadedImage || selectedMessage?.imageUrl;
    const imagePayload = parseImageDataUrl(imageToUse);

    const isContextImage = !uploadedImage && !!imagePayload?.base64;

    onSendMessage(promptInput, imagePayload?.base64, "1:1", selectedNodeId || undefined, isContextImage, imagePayload?.mimeType);
    setPromptInput('');
    clearUpload();
  };



  const performAutoLayout = () => {
    // Basic Tree Layout Algorithm
    // 1. Identify roots (no parent or parent not in list)
    // 2. DFS traversal
    const newPositions: Record<string, { x: number, y: number }> = {};
    const rootNodes = messages.filter(m => !m.parentId || !messages.find(p => p.id === m.parentId));

    // Config
    const NODE_WIDTH = 450;
    const NODE_HEIGHT = 400; // Estimated
    const GAP_X = 50;
    const GAP_Y = 50;

    let globalY = 0;

    const layoutNode = (nodeId: string, depth: number) => {
      const children = messages.filter(m => m.parentId === nodeId);
      const x = depth * (NODE_WIDTH + GAP_X);

      if (children.length === 0) {
        // Leaf node
        newPositions[nodeId] = { x, y: globalY };
        globalY += NODE_HEIGHT + GAP_Y;
        return newPositions[nodeId].y;
      } else {
        // Parent node: place children first (post-order) or calculate children positions then center self
        const childYs: number[] = [];
        children.forEach(child => {
          childYs.push(layoutNode(child.id, depth + 1));
        });

        // Center parent vertically relative to children
        const minY = Math.min(...childYs);
        const maxY = Math.max(...childYs);
        const y = (minY + maxY) / 2;

        newPositions[nodeId] = { x, y };
        return y;
      }
    };

    rootNodes.forEach(root => {
      layoutNode(root.id, 0);
      globalY += NODE_HEIGHT; // Gap between trees
    });

    // Synchronously update the fast positions ref before triggering Zustand/React state updates,
    // so the subsequent render immediately uses the new auto-layout coordinates instead of lagging by one render cycle.
    Object.entries(newPositions).forEach(([id, pos]) => {
      fastNodePositions.current[id] = pos;
    });

    onAutoLayout(newPositions);
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full relative bg-muted/30 overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div
        ref={bgRef}
        className="absolute inset-0 opacity-10 pointer-events-none [will-change:transform]"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          transform: `translate(${position.x % (20 * scale)}px, ${position.y % (20 * scale)}px)`
        }}
      />

      <div
        ref={contentRef}
        className="absolute inset-0 origin-top-left [will-change:transform]"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
        }}
      >
        <ConnectionsLayer
          messages={messages}
          fastNodePositions={fastNodePositions}
          isDragging={!!draggingNodeId}
          simplified={simplifyConnections}
          maxRenderedConnections={maxRenderedConnections}
          viewportBounds={shouldCull ? viewportBounds ?? undefined : undefined}
        />

        {renderedMessages.map((msg) => {
          const pos = getEffectivePosition(msg);
          const isSelected = selectedNodeId === msg.id;

          return (
            <div
              key={msg.id}
              ref={el => { nodeRefs.current[msg.id] = el }}
              className="absolute pointer-events-none"
              style={{
                left: 0, top: 0, zIndex: isSelected ? 10 : 1,
                transform: `translate(${pos.x}px, ${pos.y}px)`
              }}
            >
              <div className="pointer-events-auto">
                <CanvasNode
                  msg={msg}
                  isSelected={isSelected}
                  lowDetail={lowDetailMode}
                  isChinese={isChinese}
                  t={t}
                  tChat={tChat}
                  onMouseDown={handleNodeMouseDown}
                  onDownload={handleNodeDownload}
                  onRegenerate={handleNodeRegenerate}
                  onDelete={handleNodeDelete}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 w-[min(600px,calc(100%_-_1rem))] node-interactive cursor-auto" onMouseDown={e => e.stopPropagation()}>
        {/* Upload Preview */}
        {uploadedImage && (
          <div className="absolute bottom-full left-0 mb-2 p-2 bg-background/90 backdrop-blur rounded-lg border border-border shadow-lg flex items-center gap-2">
            <div className="w-12 h-12 rounded bg-muted overflow-hidden">
              <img src={uploadedImage} alt="Upload" className="w-full h-full object-cover" decoding="async" />
            </div>
            <button onClick={clearUpload} aria-label="Clear upload" className="p-2 hover:bg-muted rounded-full text-muted-foreground">
              <Icons.SidebarClose size={14} className="rotate-45" />
            </button>
          </div>
        )}

        <form
          onSubmit={handleFloatingSubmit}
          className="bg-background/90 backdrop-blur-xl p-3 rounded-2xl shadow-2xl border border-border/50 flex gap-2 ring-1 ring-border/5"
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={triggerFileUpload}
                aria-label={tChat('uploadImage')}
                className="min-h-11 min-w-11 p-3 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl transition-colors"
              >
                <Icons.New size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {tChat('uploadImage')}
            </TooltipContent>
          </Tooltip>

          <div className="flex flex-col flex-1 pl-2 justify-center">
            {!promptInput && (
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  {selectedMessage ? t('branching') : t('newRoot')}
                </span>
              </div>
            )}
            {/* Updated input style: outline-none and no border */}
            <input
              type="text"
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              placeholder={uploadedImage ? t('editUploaded') : (selectedMessage?.imageUrl ? t('describeChanges') : t('createNew'))}
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 px-0 py-0 text-foreground placeholder-muted-foreground font-medium text-base shadow-none ring-0"
              disabled={isProcessing}
            />
          </div>
          <button
            type="submit"
            aria-label={tChat('sending')}
            disabled={!promptInput.trim() || isProcessing}
            className="min-h-11 min-w-11 bg-primary text-primary-foreground p-3.5 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-md hover:scale-105 active:scale-95"
          >
            <Icons.Send size={20} />
          </button>
        </form>
      </div>

      {/* Right Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 node-interactive">
        <button onClick={() => setScale(0.8)} aria-label="Reset zoom" className="min-h-11 min-w-11 bg-card p-2 rounded-lg shadow-md border border-border hover:bg-muted text-muted-foreground font-mono text-xs">
          {Math.round(scale * 100)}%
        </button>
      </div>

      {/* Bottom Right Auto Layout Button */}
      <div className="absolute bottom-4 right-4 node-interactive">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={performAutoLayout}
              aria-label={t('autoLayout')}
              className="min-h-11 min-w-11 bg-card p-3 rounded-full shadow-lg border border-border hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all"
            >
              <Icons.AutoLayout size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {t('autoLayout')}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
