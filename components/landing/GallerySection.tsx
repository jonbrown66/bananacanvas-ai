'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CanvasNode } from '@/components/workspace/CanvasNode';
import { Message } from '../../types';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

type NodeId = 'sourceA' | 'sourceB' | 'result';
type Point = { x: number; y: number };

const NODE_BASE_WIDTH = 320;
const NODE_SCALE = 0.86;
const NODE_WIDTH = Math.round(NODE_BASE_WIDTH * NODE_SCALE);
const DEFAULT_NODE_HEIGHT = 260;
const CANVAS_PADDING = 16;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const GallerySection = () => {
  const tLanding = useTranslations('LandingPage.Gallery');
  const tCanvas = useTranslations('Canvas');
  const tChat = useTranslations('Chat');
  const locale = useLocale();
  const isChinese = locale === 'zh-CN';
  const shouldReduceMotion = usePrefersReducedMotion();

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: NodeId; offsetX: number; offsetY: number } | null>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasCenteredInitialLayout = useRef(false);

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [draggingId, setDraggingId] = useState<NodeId | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<NodeId, Point>>({
    sourceA: { x: 30, y: 40 },
    sourceB: { x: 30, y: 240 },
    result: { x: 460, y: 140 }
  });
  const [nodeHeights, setNodeHeights] = useState<Record<NodeId, number>>({
    sourceA: DEFAULT_NODE_HEIGHT,
    sourceB: DEFAULT_NODE_HEIGHT,
    result: DEFAULT_NODE_HEIGHT
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const update = () => {
      const rect = canvas.getBoundingClientRect();
      setCanvasSize({
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setNodeHeights((prev) => {
      let changed = false;
      const next = { ...prev };
      (Object.keys(prev) as NodeId[]).forEach((id) => {
        const el = nodeRefs.current[id];
        if (!el) return;
        const measured = Math.max(80, Math.round(el.getBoundingClientRect().height));
        if (Math.abs(measured - prev[id]) > 1) {
          next[id] = measured;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [canvasSize.height, canvasSize.width, nodePositions.sourceA.x, nodePositions.sourceB.x, nodePositions.result.x]);

  const getBounds = (id: NodeId) => {
    const maxX = Math.max(CANVAS_PADDING, (canvasSize.width || 1200) - NODE_WIDTH - CANVAS_PADDING);
    const nodeHeight = nodeHeights[id] || DEFAULT_NODE_HEIGHT;
    const maxY = Math.max(CANVAS_PADDING, (canvasSize.height || 560) - nodeHeight - CANVAS_PADDING);

    return {
      minX: CANVAS_PADDING,
      maxX,
      minY: CANVAS_PADDING,
      maxY
    };
  };

  useEffect(() => {
    if (hasCenteredInitialLayout.current) return;
    if (!canvasSize.width || !canvasSize.height) return;

    const nodeHeightA = nodeHeights.sourceA || DEFAULT_NODE_HEIGHT;
    const nodeHeightB = nodeHeights.sourceB || DEFAULT_NODE_HEIGHT;
    const nodeHeightR = nodeHeights.result || DEFAULT_NODE_HEIGHT;
    const horizontalGap = 120;
    const verticalGap = 36;

    const leftColumnHeight = nodeHeightA + verticalGap + nodeHeightB;
    const layoutHeight = Math.max(leftColumnHeight, nodeHeightR);
    const layoutWidth = NODE_WIDTH * 2 + horizontalGap;
    const startX = Math.max(
      CANVAS_PADDING,
      Math.round((canvasSize.width - layoutWidth) * 0.5)
    );
    const startY = Math.max(
      CANVAS_PADDING,
      Math.round((canvasSize.height - layoutHeight) * 0.5)
    );

    const rawLayout: Record<NodeId, Point> = {
      sourceA: { x: startX, y: startY },
      sourceB: { x: startX, y: startY + nodeHeightA + verticalGap },
      result: {
        x: startX + NODE_WIDTH + horizontalGap,
        y: startY + Math.round((layoutHeight - nodeHeightR) * 0.5)
      }
    };

    const centeredLayout: Record<NodeId, Point> = { ...rawLayout };
    (Object.keys(rawLayout) as NodeId[]).forEach((id) => {
      const bounds = getBounds(id);
      centeredLayout[id] = {
        x: clamp(rawLayout[id].x, bounds.minX, bounds.maxX),
        y: clamp(rawLayout[id].y, bounds.minY, bounds.maxY)
      };
    });

    setNodePositions(centeredLayout);
    hasCenteredInitialLayout.current = true;
  }, [canvasSize.height, canvasSize.width, nodeHeights.result, nodeHeights.sourceA, nodeHeights.sourceB]);

  useEffect(() => {
    setNodePositions((prev) => {
      const next: Record<NodeId, Point> = { ...prev };
      (Object.keys(prev) as NodeId[]).forEach((id) => {
        const bounds = getBounds(id);
        next[id] = {
          x: clamp(prev[id].x, bounds.minX, bounds.maxX),
          y: clamp(prev[id].y, bounds.minY, bounds.maxY)
        };
      });
      return next;
    });
  }, [canvasSize.height, canvasSize.width]);

  useEffect(() => {
    if (!draggingId) return;

    const applyDragMove = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const drag = dragRef.current;
      if (!canvas || !drag) return;

      const rect = canvas.getBoundingClientRect();
      const bounds = getBounds(drag.id);
      const nextX = clamp(clientX - rect.left - drag.offsetX, bounds.minX, bounds.maxX);
      const nextY = clamp(clientY - rect.top - drag.offsetY, bounds.minY, bounds.maxY);

      const nodeEl = nodeRefs.current[drag.id];
      if (nodeEl) {
        nodeEl.style.transform = `translate(${nextX}px, ${nextY}px) scale(${NODE_SCALE})`;
      }

      setNodePositions((prev) => ({
        ...prev,
        [drag.id]: { x: nextX, y: nextY }
      }));
    };

    const endDrag = () => {
      dragRef.current = null;
      setDraggingId(null);
    };

    const onMove = (event: MouseEvent) => applyDragMove(event.clientX, event.clientY);
    const onUp = () => endDrag();

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('blur', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('blur', onUp);
    };
  }, [draggingId, canvasSize.height, canvasSize.width, nodeHeights]);

  const handleNodeMouseDown = (event: React.MouseEvent, id: string) => {
    if (id !== 'sourceA' && id !== 'sourceB' && id !== 'result') return;
    event.stopPropagation();

    const nodeId = id as NodeId;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const pos = nodePositions[nodeId];
    dragRef.current = {
      id: nodeId,
      offsetX: event.clientX - rect.left - pos.x,
      offsetY: event.clientY - rect.top - pos.y
    };
    setDraggingId(nodeId);
  };

  const noopDownload = (event: React.MouseEvent, _url: string) => {
    event.stopPropagation();
  };
  const noopRegenerate = (event: React.MouseEvent, _msg: Message) => {
    event.stopPropagation();
  };
  const noopDelete = (event: React.MouseEvent, _id: string) => {
    event.stopPropagation();
  };
  const nodeTransform = (pos: Point) => `translate(${pos.x}px, ${pos.y}px) scale(${NODE_SCALE})`;

  const sourceAMessage: Message = {
    id: 'sourceA',
    role: 'user',
    text: 'Wear sunglasses',
    timestamp: 1711800060000
  };

  const sourceBMessage: Message = {
    id: 'sourceB',
    role: 'user',
    text: 'Add soft rim light',
    timestamp: 1711800180000
  };

  const anchorA = useMemo<Point>(
    () => ({ x: nodePositions.sourceA.x + NODE_WIDTH, y: nodePositions.sourceA.y + (nodeHeights.sourceA || DEFAULT_NODE_HEIGHT) * 0.5 }),
    [nodeHeights.sourceA, nodePositions.sourceA.x, nodePositions.sourceA.y]
  );
  const anchorB = useMemo<Point>(
    () => ({ x: nodePositions.sourceB.x + NODE_WIDTH, y: nodePositions.sourceB.y + (nodeHeights.sourceB || DEFAULT_NODE_HEIGHT) * 0.5 }),
    [nodeHeights.sourceB, nodePositions.sourceB.x, nodePositions.sourceB.y]
  );
  const mergeAnchor = useMemo<Point>(
    () => ({
      x: nodePositions.result.x,
      y: nodePositions.result.y + (nodeHeights.result || DEFAULT_NODE_HEIGHT) * 0.5
    }),
    [nodeHeights.result, nodePositions.result.x, nodePositions.result.y]
  );

  const resultMessage: Message = useMemo(
    () => ({
      id: 'result',
      role: 'model',
      text: 'Generated image: sunglasses + soft rim light',
      imageUrl: '/minicanvans.png',
      timestamp: 1711800300000
    }),
    []
  );

  return (
    <section className="py-28 px-6 bg-background/50">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-2xl mb-12">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground mb-6 leading-none">
            {tLanding('title')}
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-[62ch]">
            {tLanding('subtitle')}
          </p>
        </div>

        <div className="rounded-[2rem] border border-border/70 overflow-hidden shadow-[0_26px_70px_-36px_rgba(0,0,0,0.45)]">
          <div
            ref={canvasRef}
            className="relative h-[500px] md:h-[560px] select-none"
            style={{ touchAction: 'none' }}
          >
            <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
              {[
                { start: anchorA, end: mergeAnchor },
                { start: anchorB, end: mergeAnchor }
              ].map((line, index) => {
                const controlX = Math.max(line.start.x, (line.start.x + line.end.x) * 0.5);
                return (
                  <path
                    key={`link-${index}`}
                    d={`M ${line.start.x} ${line.start.y} C ${controlX} ${line.start.y}, ${controlX} ${line.end.y}, ${line.end.x} ${line.end.y}`}
                    stroke={'hsl(var(--primary))'}
                    strokeWidth={2.2}
                    strokeDasharray={shouldReduceMotion ? undefined : '10 12'}
                    fill="none"
                    strokeLinecap="round"
                    opacity={0.92}
                    className={shouldReduceMotion ? undefined : `gallery-link-flow gallery-link-flow-${index % 2 === 0 ? 'a' : 'b'}`}
                  />
                );
              })}
            </svg>

            {(
              [
                { id: 'sourceA' as const, msg: sourceAMessage, pos: nodePositions.sourceA },
                { id: 'sourceB' as const, msg: sourceBMessage, pos: nodePositions.sourceB }
              ] as const
            ).map((item) => (
              <div
                key={item.id}
                ref={(el) => {
                  nodeRefs.current[item.id] = el;
                }}
                className="absolute pointer-events-none"
                style={{ left: 0, top: 0, transform: nodeTransform(item.pos), transformOrigin: 'top left' }}
              >
                <div className="pointer-events-auto">
                  <CanvasNode
                    msg={item.msg}
                    isSelected={draggingId === item.id}
                    lowDetail={false}
                    isChinese={isChinese}
                    t={tCanvas}
                    tChat={tChat}
                    nodeWidth={NODE_BASE_WIDTH}
                    isAbsolute={false}
                    onMouseDown={handleNodeMouseDown}
                    onDownload={noopDownload}
                    onRegenerate={noopRegenerate}
                    onDelete={noopDelete}
                  />
                </div>
              </div>
            ))}

            <div
              className="absolute pointer-events-none"
              ref={(el) => {
                nodeRefs.current.result = el;
              }}
              style={{ left: 0, top: 0, transform: nodeTransform(nodePositions.result), transformOrigin: 'top left' }}
            >
              <div className="pointer-events-auto">
                <CanvasNode
                  msg={resultMessage}
                  isSelected={draggingId === 'result'}
                  lowDetail={false}
                  isChinese={isChinese}
                  t={tCanvas}
                  tChat={tChat}
                  nodeWidth={NODE_BASE_WIDTH}
                  isAbsolute={false}
                  onMouseDown={handleNodeMouseDown}
                  onDownload={noopDownload}
                  onRegenerate={noopRegenerate}
                  onDelete={noopDelete}
                />
              </div>
            </div>

            <div
              className={`absolute pointer-events-none w-3 h-3 rounded-full border-2 bg-primary border-primary-foreground/60 ${shouldReduceMotion ? '' : 'gallery-merge-pulse'}`}
              style={{
                left: `${mergeAnchor.x}px`,
                top: `${mergeAnchor.y}px`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
