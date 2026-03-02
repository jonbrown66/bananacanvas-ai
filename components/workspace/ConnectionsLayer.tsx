import React, { useEffect, useRef, useState } from 'react';
import { Message } from '../../types';

interface ConnectionsLayerProps {
    messages: Message[];
    fastNodePositions: React.MutableRefObject<Record<string, { x: number, y: number }>>;
    isDragging: boolean;
}

export const ConnectionsLayer: React.FC<ConnectionsLayerProps> = ({ messages, fastNodePositions, isDragging }) => {
    // Use a minimal local state triggered only by requestAnimationFrame during dragging
    const [, setTick] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (isDragging) {
            const loop = () => {
                setTick((t: number) => t + 1);
                rafRef.current = requestAnimationFrame(loop);
            };
            rafRef.current = requestAnimationFrame(loop);
        } else {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        }
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isDragging]);

    const NODE_WIDTH = 380;
    const NODE_HEADER_HEIGHT = 60;

    const messageMap = new Map<string, Message>();
    for (const m of messages) {
        messageMap.set(m.id, m);
    }

    const connections: React.ReactNode[] = [];

    messages.forEach(msg => {
        if (!msg.parentId) return;
        const parent = messageMap.get(msg.parentId);
        if (!parent) return;

        // Use mutable ref for instantaneous coordinates without React state delay
        const start = fastNodePositions.current[parent.id] || parent.position || { x: 0, y: 0 };
        const end = fastNodePositions.current[msg.id] || msg.position || { x: 0, y: 0 };

        const startX = start.x + NODE_WIDTH;
        const startY = start.y + NODE_HEADER_HEIGHT;
        const endX = end.x;
        const endY = end.y + NODE_HEADER_HEIGHT;

        const dist = Math.abs(endX - startX);
        const controlPointOffset = Math.max(dist * 0.5, 100);

        connections.push(
            <svg key={`conn-${msg.id}`} className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-0">
                <path
                    d={`M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY}`}
                    stroke="hsl(var(--border))"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                />
                <circle cx={startX} cy={startY} r="4" fill="hsl(var(--muted-foreground))" />
                <circle cx={endX} cy={endY} r="4" fill="hsl(var(--muted-foreground))" />
            </svg>
        );
    });

    return <>{connections}</>;
};
