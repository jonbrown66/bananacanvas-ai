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
import { resolveImagePayload, resizeImageDataUrl, type ImageMimeType } from '@/services/geminiService';

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

  // Zoom animation state: wheel/pinch update targetScaleRef, a rAF lerp loop
  // eases scaleRef toward it while writing transforms straight to the DOM.
  const targetScaleRef = useRef(scale);
  const zoomFrameRef = useRef<number | null>(null);
  const zoomAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const panCommitTimerRef = useRef<number | null>(null);

  // Multi-pointer (touch) gesture state for two-finger pinch zoom + pan.
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const isPinchingRef = useRef(false);
  const pinchRef = useRef<{
    startDist: number;
    startScale: number;
    startMid: { x: number; y: number }; // container-relative
    startCanvasMid: { x: number; y: number };
  } | null>(null);

  // Prevent browser native zoom (Ctrl + scroll) and page pull-to-refresh inside canvas
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

  // Cleanup zoom rAF loop and pending commit timers on unmount
  useEffect(() => {
    return () => {
      if (zoomFrameRef.current !== null) cancelAnimationFrame(zoomFrameRef.current);
      if (panCommitTimerRef.current !== null) window.clearTimeout(panCommitTimerRef.current);
    };
  }, []);


  // refs (fastPosition/scaleRef) are the single source of truth during
  // gestures; React state is a committed projection of them. Do NOT sync
  // state back into these refs on every render: doing so let a stale state
  // value clobber an in-flight lerp or drag (visible as zoom jitter).
  // Instead, only apply external resets (project switch) through the
  // dedicated effect below, which writes state and refs together.
  useEffect(() => {
    fastPosition.current = position;
    scaleRef.current = scale;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.x, position.y, scale]);

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
  const isLargeScene = messages.length >= 25;
  const isInteracting = isDraggingCanvas || !!draggingNodeId;
  const shouldTrackDragViewport = isLargeScene && isInteracting;
  const prefersReducedMotionRef = useRef(false);

  // One-shot arrival animation: when a placeholder is replaced by the real
  // result node, pop it in (scale+fade) so "the answer has landed" is legible.
  const justArrivedIdRef = useRef<string | null>(null);
  const [justArrivedId, setJustArrivedId] = useState<string | null>(null);
  const arrivalTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const pendingId = justArrivedIdRef.current;
    if (!pendingId) return;
    const arrived = messages.find(m => m.id === pendingId);
    if (!arrived || arrived.isPlaceholder) return;

    justArrivedIdRef.current = null;
    if (prefersReducedMotionRef.current) return;

    setJustArrivedId(pendingId);
    if (arrivalTimerRef.current) window.clearTimeout(arrivalTimerRef.current);
    arrivalTimerRef.current = window.setTimeout(() => setJustArrivedId(null), 450);
  }, [messages]);

  useEffect(() => {
    return () => {
      if (arrivalTimerRef.current) window.clearTimeout(arrivalTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotionRef.current = mq.matches;
    const listener = (e: MediaQueryListEvent) => { prefersReducedMotionRef.current = e.matches; };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

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
    if (process.env.NODE_ENV === 'development') return;

    // Duty-cycle sampling: measure for 2s, report, sleep 30s. A permanent rAF
    // loop here burned battery while idle and polluted the very metric it
    // was measuring.
    const SAMPLE_MS = 2000;
    const SLEEP_MS = 30000;
    let rafId: number | null = null;
    let sleepTimer: number | null = null;
    let startAt = performance.now();
    let lastTs = startAt;
    let frames = 0;
    let droppedFrames = 0;
    let disposed = false;

    const report = () => {
      const duration = Math.max(performance.now() - startAt, 1);
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
        tags: { messages: messages.length }
      });
    };

    const loop = (now: number) => {
      if (document.hidden) {
        lastTs = now;
        startAt = now - frames * 16.67; // don't count hidden time as elapsed sample
        rafId = requestAnimationFrame(loop);
        return;
      }

      const delta = now - lastTs;
      if (delta > 18) {
        droppedFrames += Math.max(0, Math.round(delta / 16.67) - 1);
      }

      frames += 1;
      if (now - startAt >= SAMPLE_MS) {
        report();
        // Sleep, then start a fresh sample window.
        frames = 0;
        droppedFrames = 0;
        startAt = performance.now();
        lastTs = startAt;
        sleepTimer = window.setTimeout(() => {
          if (!disposed) rafId = requestAnimationFrame(loop);
        }, SLEEP_MS);
        return;
      }

      lastTs = now;
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (sleepTimer !== null) window.clearTimeout(sleepTimer);
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
    // Remember it so the real node replacing it gets a one-shot arrival pop.
    justArrivedIdRef.current = placeholder.id;

    // Pan the canvas so the placeholder is roughly centered in the viewport
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const nodePos = placeholder.position || { x: 0, y: 0 };
    const nodeWidth = 380;
    const nodeHeight = 350; // approximate skeleton height

    const targetX = rect.width / 2 - (nodePos.x + nodeWidth / 2) * scale;
    const targetY = rect.height / 2 - (nodePos.y + nodeHeight / 2) * scale;

    // Apply smooth CSS transition then update position (skip for reduced motion)
    const panTransition = prefersReducedMotionRef.current ? '' : 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
    if (contentRef.current) {
      contentRef.current.style.transition = panTransition;
    }
    if (bgRef.current) {
      bgRef.current.style.transition = panTransition;
    }

    setPosition({ x: targetX, y: targetY });
    fastPosition.current = { x: targetX, y: targetY };

    // Remove transition after animation completes so dragging stays instant
    const timer = setTimeout(() => {
      if (contentRef.current) contentRef.current.style.transition = '';
      if (bgRef.current) bgRef.current.style.transition = '';
    }, prefersReducedMotionRef.current ? 0 : 650);

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

  // Apply current scaleRef/fastPosition to the DOM without a React render.
  const applyFastTransform = React.useCallback(() => {
    const s = scaleRef.current;
    const p = fastPosition.current;
    if (contentRef.current) {
      contentRef.current.style.transform = `translate(${p.x}px, ${p.y}px) scale(${s})`;
    }
    if (bgRef.current) {
      const bg = bgRef.current;
      bg.style.transform = `translate(${p.x % (20 * s)}px, ${p.y % (20 * s)}px)`;
      bg.style.backgroundSize = `${20 * s}px ${20 * s}px`;
    }
  }, []);

  // Commit fast values back to React state (debounced so continuous gestures
  // don't trigger a re-render per event).
  const schedulePositionCommit = React.useCallback(() => {
    if (panCommitTimerRef.current !== null) window.clearTimeout(panCommitTimerRef.current);
    panCommitTimerRef.current = window.setTimeout(() => {
      panCommitTimerRef.current = null;
      setPosition({ ...fastPosition.current });
      setScale(scaleRef.current);
    }, 120);
  }, []);

  // Keep the canvas point under the zoom anchor (cursor / pinch midpoint)
  // fixed while the scale changes.
  const setScaleAtAnchor = React.useCallback((nextScale: number, anchor: { x: number; y: number }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = anchor.x - rect.left;
    const mouseY = anchor.y - rect.top;
    const canvasX = (mouseX - fastPosition.current.x) / scaleRef.current;
    const canvasY = (mouseY - fastPosition.current.y) / scaleRef.current;

    const clamped = Math.min(Math.max(0.1, nextScale), 4);
    scaleRef.current = clamped;
    targetScaleRef.current = clamped;
    const newX = mouseX - canvasX * clamped;
    const newY = mouseY - canvasY * clamped;
    fastPosition.current = { x: newX, y: newY };
    applyFastTransform();
    schedulePositionCommit();
  }, [applyFastTransform, schedulePositionCommit]);

  // rAF lerp loop: eases scaleRef toward targetScaleRef (~150ms settle).
  const ensureZoomLoop = React.useCallback(() => {
    if (zoomFrameRef.current !== null) return;
    const loop = () => {
      const current = scaleRef.current;
      const target = targetScaleRef.current;
      const next = current + (target - current) * 0.25;

      if (Math.abs(target - next) < 0.001) {
        scaleRef.current = target;
        if (zoomAnchorRef.current) {
          setScaleAtAnchor(target, zoomAnchorRef.current);
        } else {
          applyFastTransform();
        }
        zoomFrameRef.current = null;
        schedulePositionCommit();
        return;
      }

      scaleRef.current = next;
      if (zoomAnchorRef.current) {
        setScaleAtAnchor(next, zoomAnchorRef.current);
      } else {
        applyFastTransform();
      }
      zoomFrameRef.current = requestAnimationFrame(loop);
    };
    zoomFrameRef.current = requestAnimationFrame(loop);
  }, [applyFastTransform, setScaleAtAnchor, schedulePositionCommit]);

  // Keyboard shortcuts: +/− zoom (anchored at viewport center), 0 reset,
  // Esc deselect, Delete/Backspace remove the selected node.
  const handleDeleteShortcut = useRef<CanvasWorkspaceProps['onDeleteMessage']>(onDeleteMessage);
  handleDeleteShortcut.current = onDeleteMessage;
  const selectedNodeIdRef = useRef<string | null>(null);
  selectedNodeIdRef.current = selectedNodeId;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        return;
      }

      const zoomKeys: Record<string, number> = { '+': 1.2, '=': 1.2, '-': 1 / 1.2, '_': 1 / 1.2 };
      if (zoomKeys[e.key]) {
        e.preventDefault();
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const next = targetScaleRef.current * zoomKeys[e.key];
        targetScaleRef.current = Math.min(Math.max(0.1, next), 4);
        zoomAnchorRef.current = center;
        setScaleAtAnchor(targetScaleRef.current, center);
        ensureZoomLoop();
        return;
      }

      if (e.key === '0') {
        e.preventDefault();
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        // Reset zoom to 100% keeping current pan position anchored at center.
        zoomAnchorRef.current = center;
        setScaleAtAnchor(1, center);
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIdRef.current) {
        e.preventDefault();
        const container = containerRef.current;
        const x = container ? container.getBoundingClientRect().width / 2 : 400;
        const y = container ? container.getBoundingClientRect().height / 2 : 300;
        handleDeleteShortcut.current(selectedNodeIdRef.current, { x, y });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setScaleAtAnchor, ensureZoomLoop]);

  // Wheel semantics (Figma/Miro convention):
  //  - plain wheel / trackpad scroll  → pan
  //  - shift + wheel                  → horizontal pan
  //  - ctrl/cmd + wheel (or pinch)    → zoom, anchored at the cursor
  // Native listener with passive:false so pan/zoom can preventDefault.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isPinchingRef.current) return;

      if (e.ctrlKey || e.metaKey) {
        // Trackpad pinch delivers ctrlKey wheel events with small deltas.
        const intensity = e.ctrlKey && !e.metaKey ? 0.015 : 0.05;
        const factor = Math.exp(-e.deltaY * intensity);
        const target = targetScaleRef.current * factor;
        targetScaleRef.current = Math.min(Math.max(0.1, target), 4);
        zoomAnchorRef.current = { x: e.clientX, y: e.clientY };
        setScaleAtAnchor(targetScaleRef.current, zoomAnchorRef.current);
        return;
      }

      // Pan: commit back to state on a short debounce so viewport culling
      // and child components stay in sync without per-event renders.
      const next = {
        x: fastPosition.current.x - (e.shiftKey && e.deltaY ? e.deltaY : e.deltaX),
        y: fastPosition.current.y - (e.shiftKey ? 0 : e.deltaY)
      };
      fastPosition.current = next;
      applyFastTransform();
      schedulePositionCommit();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [applyFastTransform, schedulePositionCommit, setScaleAtAnchor]);

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.node-interactive')) return;

    // Track every active pointer; two-finger touch triggers pinch-zoom.
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 2) {
      // Switch to pinch gesture: cancel any in-flight one-pointer drag.
      isDraggingCanvasRef.current = false;
      setIsDraggingCanvas(false);
      draggingNodeIdRef.current = null;
      setDraggingNodeId(null);

      const [p1, p2] = [...activePointersRef.current.values()];
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mid = { x: (p1.x + p2.x) / 2 - rect.left, y: (p1.y + p2.y) / 2 - rect.top };
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
      pinchRef.current = {
        startDist: dist,
        startScale: scaleRef.current,
        startMid: mid,
        startCanvasMid: {
          x: (mid.x - fastPosition.current.x) / scaleRef.current,
          y: (mid.y - fastPosition.current.y) / scaleRef.current
        }
      };
      isPinchingRef.current = true;
      return;
    }

    if (activePointersRef.current.size > 2 || isPinchingRef.current) return;

    isDraggingCanvasRef.current = true;
    setIsDraggingCanvas(true);
    canvasDragStartRef.current = { x: e.clientX - fastPosition.current.x, y: e.clientY - fastPosition.current.y };
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

  const handleNodePointerDown = React.useCallback((e: React.PointerEvent, msgId: string) => {
    // Two-finger touch must pinch, not drag the node.
    if (e.pointerType === 'touch') return;
    e.stopPropagation();
    const msg = messagesRef.current.find(m => m.id === msgId);
    if (!msg) return;

    setSelectedNodeId(msgId);
    setDraggingNodeId(msgId);

    const pos = fastNodePositions.current[msgId] || msg.position || { x: 0, y: 0 };
    const nextOffset = {
      x: e.clientX / scaleRef.current - pos.x,
      y: e.clientY / scaleRef.current - pos.y
    };

    draggingNodeIdRef.current = msgId;
    nodeDragOffsetRef.current = nextOffset;
  }, []);

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
    if (isPinchingRef.current && pinchRef.current) {
      // Two-finger pinch: scale from finger distance, pan follows the midpoint.
      const pointers = [...activePointersRef.current.values()];
      if (pointers.length < 2) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const [p1, p2] = pointers;
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
      const mid = { x: (p1.x + p2.x) / 2 - rect.left, y: (p1.y + p2.y) / 2 - rect.top };
      const pinch = pinchRef.current;

      const nextScale = Math.min(Math.max(0.1, pinch.startScale * (dist / pinch.startDist)), 4);
      scaleRef.current = nextScale;
      targetScaleRef.current = nextScale;
      fastPosition.current = {
        x: mid.x - pinch.startCanvasMid.x * nextScale,
        y: mid.y - pinch.startCanvasMid.y * nextScale
      };
      applyFastTransform();
      schedulePositionCommit();
      return;
    }

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
  }, [applyFastTransform, schedulePositionCommit]);

  const applyDragEnd = React.useCallback((clientX: number, clientY: number) => {
    const activeNodeId = draggingNodeIdRef.current;
    const wasDraggingCanvas = isDraggingCanvasRef.current;
    const wasPinching = isPinchingRef.current;

    if (!activeNodeId && !wasDraggingCanvas && !wasPinching) return;

    if (wasDraggingCanvas) {
      setPosition(fastPosition.current);
      // Only deselect on a pure click (no significant movement), not on drag/pan
      if (canvasClickStart.current && Number.isFinite(clientX)) {
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
    isPinchingRef.current = false;
    pinchRef.current = null;
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  }, [onUpdateNodePosition]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    applyDragMove(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    // One finger lifted from a pinch → the gesture ends entirely (do not
    // silently resume a one-finger pan from a stale drag start).
    if (isPinchingRef.current) {
      applyDragEnd(Number.NaN, Number.NaN);
      return;
    }
    applyDragEnd(e.clientX, e.clientY);
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    applyDragEnd(Number.NaN, Number.NaN);
  };

  useEffect(() => {
    if (!isDraggingCanvas && !draggingNodeId) return;

    const handleWindowPointerMove = (e: PointerEvent) => applyDragMove(e.clientX, e.clientY);
    const handleWindowPointerUp = (e: PointerEvent) => applyDragEnd(e.clientX, e.clientY);
    const handleWindowBlur = () => applyDragEnd(Number.NaN, Number.NaN);

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
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

  const handleFloatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isProcessing) return;

    // Priority: Uploaded Image > Selected Node Image
    const imageToUse = uploadedImage || selectedMessage?.imageUrl;
    const imagePayload = await resolveImagePayload(imageToUse);

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

    // Build the child index once: the per-node messages.filter made layout O(n²).
    const childrenByParent = new Map<string, Message[]>();
    for (const m of messages) {
      if (!m.parentId) continue;
      const list = childrenByParent.get(m.parentId);
      if (list) list.push(m);
      else childrenByParent.set(m.parentId, [m]);
    }

    let globalY = 0;

    const layoutNode = (nodeId: string, depth: number) => {
      const children = childrenByParent.get(nodeId) || [];
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
      // Advance past the full tree extent (children advance globalY by
      // NODE_HEIGHT + GAP_Y, so the root itself must not add extra overlap).
      globalY += NODE_HEIGHT + GAP_Y; // Gap between trees
    });

    // Synchronously update the fast positions ref before triggering Zustand/React state updates,
    // so the subsequent render immediately uses the new auto-layout coordinates instead of lagging by one render cycle.
    Object.entries(newPositions).forEach(([id, pos]) => {
      fastNodePositions.current[id] = pos;
    });

    // Focal moment: let nodes glide to their new spots instead of teleporting.
    // Transient inline transition on node wrappers, removed once settled.
    const enableLayoutTransition = () => {
      if (prefersReducedMotionRef.current) return;
      const DURATION_MS = 450;
      Object.values(nodeRefs.current).forEach((el) => {
        if (!el) return;
        el.style.transition = `transform ${DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      });
      window.setTimeout(() => {
        Object.values(nodeRefs.current).forEach((el) => {
          if (el) el.style.transition = '';
        });
      }, DURATION_MS + 50);
    };
    enableLayoutTransition();

    onAutoLayout(newPositions);
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full relative bg-muted/30 overflow-hidden cursor-grab active:cursor-grabbing select-none [touch-action:none]"
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
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
          draggingNodeId={draggingNodeId}
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
                  justArrived={msg.id === justArrivedId}
                  onMouseDown={handleNodePointerDown}
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
          <div className={`absolute bottom-full left-0 mb-2 p-2 rounded-lg border shadow-lg flex items-center gap-2 ${
            isInteracting ? "bg-background/95 border-border" : "bg-background/90 backdrop-blur border-border"
          }`}>
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
          className={`p-2 rounded-2xl border transition-[background-color,border-color,box-shadow] duration-150 flex items-center gap-2 ${
            isInteracting
              ? "bg-background/95 border-border shadow-lg"
              : "bg-background/90 backdrop-blur-xl shadow-2xl border-border/50 ring-1 ring-border/5"
          }`}
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
                className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all shrink-0"
              >
                <Icons.New size={20} className="shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {tChat('uploadImage')}
            </TooltipContent>
          </Tooltip>

          <div className="flex flex-col flex-1 pl-1.5 justify-center">
            {!promptInput && (
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  {selectedMessage ? t('branching') : t('newRoot')}
                </span>
              </div>
            )}
            <input
              type="text"
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              placeholder={uploadedImage ? t('editUploaded') : (selectedMessage?.imageUrl ? t('describeChanges') : t('createNew'))}
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 px-0 py-1 text-foreground placeholder-muted-foreground font-medium text-sm shadow-none ring-0"
              disabled={isProcessing}
            />
          </div>
          <button
            type="submit"
            aria-label={tChat('sending')}
            disabled={!promptInput.trim() || isProcessing}
            className="w-10 h-10 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-md active:scale-95 flex items-center justify-center shrink-0"
          >
            <Icons.Send size={18} className="shrink-0" />
          </button>
        </form>
      </div>

      {/* Right Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 node-interactive">
        <button
          onClick={() => {
            targetScaleRef.current = 0.8;
            scaleRef.current = 0.8;
            applyFastTransform();
            schedulePositionCommit();
          }}
          aria-label="Reset zoom"
          className="min-h-11 min-w-11 bg-card p-2 rounded-lg shadow-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground font-mono text-xs active:scale-95 transition-all duration-150"
        >
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
              className="min-h-11 min-w-11 bg-card p-3 rounded-full shadow-lg border border-border hover:bg-primary/10 hover:text-primary text-muted-foreground active:scale-90 hover:rotate-12 transition-all duration-200"
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
