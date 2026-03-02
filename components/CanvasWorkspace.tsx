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
import ReactMarkdown from 'react-markdown';

interface CanvasWorkspaceProps {
  messages: Message[];
  onSendMessage: (text: string, currentImageBase64?: string, aspectRatio?: any, parentId?: string, isContextImage?: boolean) => void | Promise<void>;
  onUpdateNodePosition: (id: string, pos: { x: number, y: number }) => void | Promise<void>;
  onAutoLayout: (positions: Record<string, { x: number, y: number }>) => void | Promise<void>;
  isProcessing: boolean;
  onDeleteMessage: (id: string) => void | Promise<void>;
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
  const [canvasDragStart, setCanvasDragStart] = useState({ x: 0, y: 0 });

  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [nodeDragOffset, setNodeDragOffset] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fastPosition = useRef({ x: 0, y: 0 });
  const canvasClickStart = useRef<{ x: number; y: number } | null>(null);

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

  const selectedMessage = messages.find(m => m.id === selectedNodeId);

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom on wheel scroll by 15% each step
    if (e.deltaY === 0) return;

    const zoomFactor = 1.15;
    const isZoomIn = e.deltaY < 0;

    setScale(prev => {
      const newScale = isZoomIn ? prev * zoomFactor : prev / zoomFactor;
      // Keep scale within [0.1, 4] min/max limits
      return Math.min(Math.max(0.1, newScale), 4);
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-interactive')) return;

    setIsDraggingCanvas(true);
    setCanvasDragStart({ x: e.clientX - fastPosition.current.x, y: e.clientY - fastPosition.current.y });
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
    setNodeDragOffset({
      x: e.clientX / scale - pos.x,
      y: e.clientY / scale - pos.y
    });
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
    onDeleteMessage(msgId);
  }, [onDeleteMessage]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      const newX = e.clientX - canvasDragStart.x;
      const newY = e.clientY - canvasDragStart.y;

      fastPosition.current = { x: newX, y: newY };

      if (contentRef.current) {
        contentRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${scale})`;
      }
      if (bgRef.current) {
        bgRef.current.style.transform = `translate(${newX % (20 * scale)}px, ${newY % (20 * scale)}px)`;
      }
    } else if (draggingNodeId) {
      // Use DOM transform directly for high-frequency dragging to avoid React re-renders
      const newX = e.clientX / scale - nodeDragOffset.x;
      const newY = e.clientY / scale - nodeDragOffset.y;

      const nodeEl = nodeRefs.current[draggingNodeId];
      if (nodeEl) {
        nodeEl.style.transform = `translate(${newX}px, ${newY}px)`;
      }

      // Update mutable ref rather than react state to skip massive re-renders
      fastNodePositions.current[draggingNodeId] = { x: newX, y: newY };
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setPosition(fastPosition.current);
      // Only deselect on a pure click (no significant movement), not on drag/pan
      if (canvasClickStart.current) {
        const dx = e.clientX - canvasClickStart.current.x;
        const dy = e.clientY - canvasClickStart.current.y;
        if (dx * dx + dy * dy < 25) {
          setSelectedNodeId(null);
        }
      }
      canvasClickStart.current = null;
    }
    if (draggingNodeId && fastNodePositions.current[draggingNodeId]) {
      onUpdateNodePosition(draggingNodeId, fastNodePositions.current[draggingNodeId]);
    }
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
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
    const base64 = imageToUse ? imageToUse.split(',')[1] : undefined;

    const isContextImage = !uploadedImage && !!base64;

    onSendMessage(promptInput, base64, "1:1", selectedNodeId || undefined, isContextImage);
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
      onMouseLeave={handleMouseUp}
    >
      <div
        ref={bgRef}
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          transform: `translate(${position.x % (20 * scale)}px, ${position.y % (20 * scale)}px)`
        }}
      />

      <div
        ref={contentRef}
        className="absolute inset-0 origin-center"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
        }}
      >
        <ConnectionsLayer
          messages={messages}
          fastNodePositions={fastNodePositions}
          isDragging={!!draggingNodeId}
        />

        {messages.map((msg) => {
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

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[600px] max-w-[90%] node-interactive cursor-auto" onMouseDown={e => e.stopPropagation()}>
        {/* Upload Preview */}
        {uploadedImage && (
          <div className="absolute bottom-full left-0 mb-2 p-2 bg-background/90 backdrop-blur rounded-lg border border-border shadow-lg flex items-center gap-2">
            <div className="w-12 h-12 rounded bg-muted overflow-hidden">
              <img src={uploadedImage} alt="Upload" className="w-full h-full object-cover" decoding="async" />
            </div>
            <button onClick={clearUpload} className="p-1 hover:bg-muted rounded-full text-muted-foreground">
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
                className="p-3 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl transition-colors"
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
            disabled={!promptInput.trim() || isProcessing}
            className="bg-primary text-primary-foreground p-3.5 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-md hover:scale-105 active:scale-95"
          >
            <Icons.Send size={20} />
          </button>
        </form>
      </div>

      {/* Right Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 node-interactive">
        <button onClick={() => setScale(0.8)} className="bg-card p-2 rounded-lg shadow-md border border-border hover:bg-muted text-muted-foreground font-mono text-xs">
          {Math.round(scale * 100)}%
        </button>
      </div>

      {/* Bottom Right Auto Layout Button */}
      <div className="absolute bottom-4 right-4 node-interactive">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={performAutoLayout}
              className="bg-card p-3 rounded-full shadow-lg border border-border hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all"
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
