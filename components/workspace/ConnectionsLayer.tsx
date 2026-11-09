import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Message } from '../../types';

interface ConnectionsLayerProps {
    messages: Message[];
    fastNodePositions: React.MutableRefObject<Record<string, { x: number, y: number }>>;
    isDragging: boolean;
    /** Id of the node currently being dragged, so per-frame patches can target only its edges. */
    draggingNodeId?: string | null;
    simplified?: boolean;
    maxRenderedConnections?: number;
    viewportBounds?: {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
}

const NODE_WIDTH = 380;
const NODE_HEADER_HEIGHT = 60;

function buildPathData(
    start: { x: number; y: number },
    end: { x: number; y: number },
    simplified: boolean
) {
    const startX = start.x + NODE_WIDTH;
    const startY = start.y + NODE_HEADER_HEIGHT;
    const endX = end.x;
    const endY = end.y + NODE_HEADER_HEIGHT;

    const dist = Math.abs(endX - startX);
    const controlPointOffset = Math.max(dist * 0.45, 90);
    return simplified
        ? `M ${startX} ${startY} L ${endX} ${endY}`
        : `M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY}`;
}

export const ConnectionsLayer: React.FC<ConnectionsLayerProps> = ({
    messages,
    fastNodePositions,
    isDragging,
    draggingNodeId,
    simplified = false,
    maxRenderedConnections = 500,
    viewportBounds
}) => {
    // While dragging a node, only that node's connections change every frame.
    // Patch the affected paths' `d` attribute directly (O(degree) per frame)
    // instead of re-rendering every <path> on a tick; a low-frequency resync
    // keeps viewport culling roughly in sync (its margin is 180-240px).
    const pathRefs = useRef<Map<string, SVGPathElement>>(new Map());
    const [resyncTick, setResyncTick] = useState(0);
    const lastResyncAt = useRef(0);
    const draggingNodeIdRef = useRef<string | null>(draggingNodeId);

    draggingNodeIdRef.current = draggingNodeId;

    // Low-frequency resync loop while dragging (100ms), so culling and
    // stroke-width changes eventually settle without per-frame React work.
    useEffect(() => {
        if (!isDragging) return;

        let cancelled = false;
        let rafId: number | null = null;
        const loop = (now: number) => {
            if (cancelled) return;
            if (now - lastResyncAt.current >= 100) {
                lastResyncAt.current = now;
                setResyncTick((t) => t + 1);
            }
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);

        return () => {
            cancelled = true;
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, [isDragging]);

    const messageMap = useMemo(() => {
        const map = new Map<string, Message>();
        for (const m of messages) map.set(m.id, m);
        return map;
    }, [messages]);

    const connectionPairs = useMemo(() => {
        void resyncTick; // resync while dragging: recompute with fresh bounds
        const pairs: Array<{ childId: string; parentId: string }> = [];
        const isInViewport = (x: number, y: number) => {
            if (!viewportBounds) return true;
            const margin = 220;
            return (
                x >= viewportBounds.left - margin &&
                x <= viewportBounds.right + margin &&
                y >= viewportBounds.top - margin &&
                y <= viewportBounds.bottom + margin
            );
        };

        for (const msg of messages) {
            if (!msg.parentId) continue;
            const parent = messageMap.get(msg.parentId);
            if (!parent) continue;

            if (viewportBounds) {
                const parentPos = fastNodePositions.current[parent.id] || parent.position || { x: 0, y: 0 };
                const childPos = fastNodePositions.current[msg.id] || msg.position || { x: 0, y: 0 };
                const parentVisible = isInViewport(parentPos.x + NODE_WIDTH, parentPos.y + NODE_HEADER_HEIGHT);
                const childVisible = isInViewport(childPos.x, childPos.y + NODE_HEADER_HEIGHT);
                if (!parentVisible && !childVisible) continue;
            }

            pairs.push({ childId: msg.id, parentId: msg.parentId });
        }

        if (pairs.length > maxRenderedConnections) {
            return pairs.slice(-maxRenderedConnections);
        }

        return pairs;
    }, [messages, messageMap, viewportBounds, fastNodePositions, maxRenderedConnections, resyncTick]);

    // Per-frame direct DOM patch: rewrite only the paths touching the dragged node.
    useEffect(() => {
        if (!isDragging) return;
        let rafId: number | null = null;

        const patchDraggedPaths = () => {
            const draggedId = draggingNodeIdRef.current;
            if (!draggedId) return;
            const draggedPos = fastNodePositions.current[draggedId];
            if (!draggedPos) return;

            for (const { childId, parentId } of connectionPairs) {
                if (childId !== draggedId && parentId !== draggedId) continue;
                const el = pathRefs.current.get(`conn-${childId}`);
                if (!el) continue;

                const parent = messageMap.get(parentId);
                const child = messageMap.get(childId);
                if (!parent || !child) continue;

                const start = fastNodePositions.current[parent.id] || parent.position || { x: 0, y: 0 };
                const end = fastNodePositions.current[child.id] || child.position || { x: 0, y: 0 };
                el.setAttribute('d', buildPathData(start, end, simplified));
            }
        };

        const loop = () => {
            patchDraggedPaths();
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);

        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, [isDragging, connectionPairs, messageMap, fastNodePositions, simplified]);

    return (
        <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-0" aria-hidden="true">
            {connectionPairs.map(({ childId, parentId }) => {
                const parent = messageMap.get(parentId)!;
                const child = messageMap.get(childId)!;

                const start = fastNodePositions.current[parent.id] || parent.position || { x: 0, y: 0 };
                const end = fastNodePositions.current[child.id] || child.position || { x: 0, y: 0 };

                return (
                    <path
                        key={`conn-${childId}`}
                        ref={(el) => {
                            if (el) pathRefs.current.set(`conn-${childId}`, el);
                            else pathRefs.current.delete(`conn-${childId}`);
                        }}
                        d={buildPathData(start, end, simplified)}
                        stroke="hsl(var(--border))"
                        strokeWidth={simplified ? 1.6 : (isDragging ? 2 : 2.5)}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={simplified ? 0.7 : 0.85}
                    />
                );
            })}
        </svg>
    );
};
