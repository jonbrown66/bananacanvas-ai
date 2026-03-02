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

const nodeCardVariants = cva(
    "flex flex-col rounded-2xl border bg-card overflow-visible transition-all duration-200",
    {
        variants: {
            isSelected: {
                true: "border-primary shadow-2xl ring-4 ring-primary/10 scale-[1.01]",
                false: "border-border shadow-lg hover:border-primary/50"
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
                user: "bg-muted/50 border-border",
                model: "bg-gradient-to-r from-ai-start/10 to-card border-ai-start/20"
            }
        },
        defaultVariants: {
            role: "user"
        }
    }
);

const avatarVariants = cva(
    "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shadow-sm",
    {
        variants: {
            role: {
                user: "bg-card text-muted-foreground border border-border",
                model: "bg-gradient-to-br from-ai-start to-ai-end text-ai-text"
            }
        },
        defaultVariants: {
            role: "user"
        }
    }
);

interface CanvasNodeProps {
    msg: Message;
    isSelected: boolean;
    isChinese: boolean;
    t: any;
    tChat: any;
    onMouseDown: (e: React.MouseEvent, msgId: string) => void;
    onDownload: (e: React.MouseEvent, url: string) => void;
    onRegenerate: (e: React.MouseEvent, msg: Message) => void;
    onDelete: (e: React.MouseEvent, msgId: string) => void;
}

export const CanvasNode = memo(({
    msg,
    isSelected,
    isChinese,
    t,
    tChat,
    onMouseDown,
    onDownload,
    onRegenerate,
    onDelete
}: CanvasNodeProps) => {
    const isPlaceholder = msg.isPlaceholder === true;

    return (
        <div
            className={cn(
                "node-interactive absolute w-[380px] transition-shadow duration-200 group",
                isPlaceholder && "generating-glow"
            )}
            onMouseDown={(e) => onMouseDown(e, msg.id)}
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
                                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground node-menu-trigger"
                                    >
                                        <Icons.More size={16} />
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
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                                </div>
                            )}

                            {msg.imageUrl && (
                                <div className="relative rounded-xl overflow-hidden border border-border bg-muted group-hover:shadow-md transition-shadow">
                                    <img
                                        src={msg.imageUrl}
                                        alt="Node content"
                                        className="w-full h-auto object-cover max-h-[400px] pointer-events-none"
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
                    ) : (
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                    {isSelected && !isPlaceholder && <span className="text-orange-500 font-medium">{t('active')}</span>}
                </div>
            </div>
        </div>
    );
});
