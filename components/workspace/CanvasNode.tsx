import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
const Markdown = ReactMarkdown as any;
import { Message } from '../../types';
import { Icons } from '../Icons';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { getNodeThumbnailUrl } from '../../services/geminiService';

const nodeCardVariants = cva(
    "flex flex-col rounded-2xl border bg-card overflow-visible transition-[border-color,box-shadow,transform] duration-200",
    {
        variants: {
            isSelected: {
                true: "border-primary/70 shadow-[0_16px_40px_-8px_rgba(249,115,22,0.25)] ring-[3px] ring-primary/20",
                false: "border-border/80 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06),0_8px_24px_-12px_rgba(0,0,0,0.10)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08),0_12px_32px_-12px_rgba(0,0,0,0.14)] hover:border-primary/30"
            }
        },
        defaultVariants: {
            isSelected: false
        }
    }
);

const headerVariants = cva(
    "px-4 py-3 flex items-center justify-between border-b rounded-t-2xl",
    {
        variants: {
            role: {
                user: "bg-muted/40 border-border/60",
                model: "bg-gradient-to-r from-ai-start/10 via-card to-card border-ai-start/15"
            }
        },
        defaultVariants: {
            role: "user"
        }
    }
);

const avatarVariants = cva(
    "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0",
    {
        variants: {
            role: {
                user: "bg-card text-muted-foreground border border-border/80",
                model: "bg-gradient-to-br from-ai-start to-ai-end text-ai-text shadow-[0_2px_6px_-1px_rgba(249,115,22,0.4)]"
            }
        },
        defaultVariants: {
            role: "user"
        }
    }
);

const MemoMarkdown = memo(
    ({ text }: { text: string }) => <Markdown>{text}</Markdown>,
    (prev, next) => prev.text === next.text
);

interface CanvasNodeProps {
    msg: Message;
    isSelected: boolean;
    lowDetail: boolean;
    isChinese: boolean;
    t: any;
    tChat: any;
    nodeWidth?: number;
    isAbsolute?: boolean;
    /** One-shot pop-in when the generation result replaces its placeholder. */
    justArrived?: boolean;
    /** Render plain text instead of markdown — used by landing demo nodes so react-markdown stays out of the landing chunk. */
    plainText?: boolean;
    onMouseDown: (e: React.PointerEvent, msgId: string) => void;
    onDownload: (e: React.MouseEvent, url: string) => void;
    onRegenerate: (e: React.MouseEvent, msg: Message) => void;
    onDelete: (e: React.MouseEvent, msgId: string) => void;
}

export const CanvasNode = memo(({
    msg,
    isSelected,
    lowDetail,
    isChinese,
    t,
    tChat,
    nodeWidth = 380,
    isAbsolute = true,
    justArrived = false,
    plainText = false,
    onMouseDown,
    onDownload,
    onRegenerate,
    onDelete
}: CanvasNodeProps) => {
    const isPlaceholder = msg.isPlaceholder === true;
    const formattedTime = React.useMemo(
        () => new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        [msg.timestamp]
    );

    return (
        <div
            className={cn(
                "node-interactive transition-shadow duration-200 group rounded-2xl",
                isAbsolute && "absolute",
                isPlaceholder && "generating-glow",
                justArrived && "node-arrive"
            )}
            style={{
                width: `${nodeWidth}px`,
                contain: 'layout style paint'
            }}
            role={isAbsolute ? 'button' : undefined}
            tabIndex={isAbsolute && !isPlaceholder ? 0 : undefined}
            aria-label={isAbsolute ? `${msg.role === 'user' ? 'Prompt' : 'Result'}: ${msg.text.slice(0, 60)}` : undefined}
            onKeyDown={isAbsolute && !isPlaceholder ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // Select without dragging: a synthetic pointer event with
                    // real coordinates (keyboard events have none, and
                    // undefined clientX would poison the drag math with NaN).
                    onMouseDown({
                        pointerId: -1,
                        pointerType: 'mouse',
                        clientX: 0,
                        clientY: 0,
                        stopPropagation: () => {},
                        preventDefault: () => {}
                    } as unknown as React.PointerEvent, msg.id);
                }
            } : undefined}
            onPointerDown={(e) => onMouseDown(e, msg.id)}
        >
            {/* Layer 2: SVG spinning dashed border */}
            {isPlaceholder && (
                <svg
                    className="glow-svg"
                    viewBox="0 0 386 386"
                    fill="none"
                    preserveAspectRatio="none"
                >
                    <rect
                        x="1" y="1"
                        width="384" height="384"
                        rx="16"
                        stroke="hsl(24.6, 95%, 53.1%)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="120 34 120 34 120 34 120 34 120 34"
                        strokeDashoffset="770"
                        style={{
                            animation: 'strokeRotate 4s linear infinite',
                        }}
                    />
                </svg>
            )}
            <div className={cn(nodeCardVariants({ isSelected: isPlaceholder ? false : isSelected }))}>
                {/* Header Handle */}
                <div className={cn(
                    headerVariants({ role: msg.role }),
                    isPlaceholder && "bg-muted/30 border-muted/50 justify-center py-2"
                )}>
                    {!isPlaceholder && (
                        <div className="flex items-center gap-2">
                            <div className={cn(avatarVariants({ role: msg.role }))}>
                                {msg.role === 'user' ? 'U' : 'AI'}
                            </div>
                            <span className={cn(
                                "text-xs font-semibold text-muted-foreground uppercase",
                                !isChinese && "tracking-wide"
                            )}>
                                {msg.role === 'user' ? t('prompt') : t('result')}
                            </span>
                        </div>
                    )}

                    {isPlaceholder && (
                        <div className="flex items-center gap-1.5 py-0.5">
                            <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
                                {t('generating')}
                            </span>
                        </div>
                    )}

                    {/* Menu Trigger & Dropdown — hidden for placeholders */}
                    {!isPlaceholder && (
                        <div className="relative node-interactive">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        aria-label="Open node actions"
                                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground active:scale-90 transition-all node-menu-trigger shrink-0"
                                    >
                                        <Icons.More size={16} className="shrink-0" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-popover/95 backdrop-blur-md shadow-lg">
                                    {msg.imageUrl && (
                                        <>
                                            <DropdownMenuItem
                                                onClick={(e) => onDownload(e, msg.imageUrl!)}
                                                className="px-3 py-2 cursor-pointer"
                                            >
                                                <Icons.Download size={14} className="mr-2" /> {tChat('download')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => onRegenerate(e, msg)}
                                                className="px-3 py-2 cursor-pointer text-blue-600 focus:text-blue-600 focus:bg-blue-50 dark:focus:bg-blue-950"
                                            >
                                                <Icons.Regenerate size={14} className="mr-2" /> {tChat('regenerate')}
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    <DropdownMenuSeparator className="bg-border/60 my-1" />
                                    <DropdownMenuItem
                                        onClick={(e) => onDelete(e, msg.id)}
                                        className="px-3 py-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                                    >
                                        <Icons.Trash size={14} className="mr-2" /> {tChat('delete')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="p-4 bg-card relative group-node-content rounded-b-2xl">
                    {isPlaceholder ? (
                        /* Skeleton placeholder content - Canvas Style */
                        <div className="space-y-4 py-2">
                            {/* Generating Indicator with text */}
                            <div className="flex flex-col items-center justify-center gap-4 py-8 border-2 border-dashed border-muted/50 rounded-xl bg-muted/5">
                                <div className="relative">
                                    <Icons.Magic size={32} className="text-primary/40 animate-pulse" />
                                    <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-ping scale-75" />
                                </div>
                                <div className="space-y-2 text-center">
                                    <p className="text-xs font-medium text-muted-foreground/80 lowercase italic px-4">
                                        {msg.text || "..."}
                                    </p>
                                </div>
                            </div>

                            {/* Subtle progress bars at bottom */}
                            <div className="space-y-1.5 opacity-40">
                                <div className="skeleton-bar h-1.5 w-full rounded-full" />
                                <div className="skeleton-bar h-1.5 w-2/3 rounded-full" />
                            </div>
                        </div>
                    ) : (
                        /* Real content */
                        <>
                            {(!msg.imageUrl || msg.role === 'user') && (
                                <div className="text-sm text-card-foreground leading-relaxed line-clamp-6 mb-2">
                                    {lowDetail || plainText ? (
                                        <span>{msg.text.slice(0, 220)}{msg.text.length > 220 ? '...' : ''}</span>
                                    ) : (
                                        <MemoMarkdown text={msg.text} />
                                    )}
                                </div>
                            )}

                            {msg.imageUrl && (
                                <div className="relative rounded-xl overflow-hidden border border-border bg-muted group-hover:shadow-md transition-shadow">
                                    {/* 512px transform variant for canvas display; download still uses msg.imageUrl */}
                                    <img
                                        src={getNodeThumbnailUrl(msg.imageUrl, 512) || msg.imageUrl}
                                        alt="Node content"
                                        className="w-full h-auto object-cover max-h-[400px] pointer-events-none block"
                                        draggable={false}
                                        loading="lazy"
                                        decoding="async"
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Stats/Time */}
                <div className="px-4 py-2 bg-muted/30 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground">
                    {isPlaceholder ? (
                        <div className="skeleton-bar h-2 w-12" />
                    ) : lowDetail ? (
                        <span>...</span>
                    ) : (
                        <span suppressHydrationWarning>{formattedTime}</span>
                    )}
                    {isSelected && !isPlaceholder && <span className="text-orange-500 font-medium">{t('active')}</span>}
                </div>
            </div>
        </div>
    );
});
