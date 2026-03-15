import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Message } from '../../types';

interface ConnectionsLayerProps {
    messages: Message[];
    fastNodePositions: React.MutableRefObject<Record<string, { x: number, y: number }>>;
    isDragging: boolean;
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

export const ConnectionsLayer: React.FC<ConnectionsLayerProps> = ({
    messages,
    fastNodePositions,
    isDragging,
    simplified = false,
    maxRenderedConnections = 500,
    viewportBounds
}) => {
    const [, setTick] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isDragging) {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
            return;
        }

        const rerenderInterval = messages.length > 260 ? 50 : 33;
        let lastRerenderAt = 0;
        const loop = (now: number) => {
            // Keep interaction intact while reducing heavy path recomputation frequency on large scenes.
            if (now - lastRerenderAt >= rerenderInterval) {
                setTick((t) => t + 1);
                lastRerenderAt = now;
            }
            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        };
    }, [isDragging, messages.length]);

    const messageMap = useMemo(() => {
        const map = new Map<string, Message>();
        for (const m of messages) map.set(m.id, m);
        return map;
    }, [messages]);

    const connectionPairs = useMemo(() => {
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
    }, [messages, messageMap, viewportBounds, fastNodePositions, maxRenderedConnections]);

    return (
        <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-0" aria-hidden="true">
            {connectionPairs.map(({ childId, parentId }) => {
                const parent = messageMap.get(parentId)!;
                const child = messageMap.get(childId)!;

                const start = fastNodePositions.current[parent.id] || parent.position || { x: 0, y: 0 };
                const end = fastNodePositions.current[child.id] || child.position || { x: 0, y: 0 };

                const startX = start.x + NODE_WIDTH;
                const startY = start.y + NODE_HEADER_HEIGHT;
                const endX = end.x;
                const endY = end.y + NODE_HEADER_HEIGHT;

                const dist = Math.abs(endX - startX);
                const controlPointOffset = Math.max(dist * 0.45, 90);
                const pathData = simplified
                    ? `M ${startX} ${startY} L ${endX} ${endY}`
                    : `M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY}`;

                return (
                    <path
                        key={`conn-${childId}`}
                        d={pathData}
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
