import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../../types';
import { Icons } from '../Icons';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const bubbleVariants = cva(
    "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
    {
        variants: {
            role: {
                user: "bg-muted text-foreground rounded-tr-sm",
                model: "bg-card border border-border text-card-foreground rounded-tl-sm"
            }
        },
        defaultVariants: {
            role: "user"
        }
    }
);

const imageContainerVariants = cva(
    "relative rounded-xl overflow-hidden border shadow-sm max-w-[140px] transition-all cursor-pointer",
    {
        variants: {
            isActive: {
                true: "ring-2 ring-primary border-primary",
                false: "border-border hover:border-primary/50"
            }
        },
        defaultVariants: {
            isActive: false
        }
    }
);

interface ChatMessageBubbleProps {
    msg: Message;
    isActive: boolean;
    t: (key: string) => string;
    isChinese: boolean;
    onImageClick: (id: string) => void;
    onDownload: (e: React.MouseEvent, url: string) => void;
    onRegenerate: (e: React.MouseEvent, msg: Message) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
}

export const ChatMessageBubble = memo(function ChatMessageBubble({
    msg,
    isActive,
    t,
    isChinese,
    onImageClick,
    onDownload,
    onRegenerate,
    onDelete
}: ChatMessageBubbleProps) {
    return (
        <div className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ai-start to-ai-end flex-shrink-0 flex items-center justify-center text-ai-text font-bold text-xs">
                    AI
                </div>
            )}

            <div className={`max-w-[85%] space-y-2`}>
                {(!msg.imageUrl || msg.role === 'user') && (
                    <div className={cn(bubbleVariants({ role: msg.role }))}>
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                )}

                {msg.imageUrl && (
                    <div className="flex items-start gap-3 group">
                        {/* Image Container */}
                        <div
                            className={cn(imageContainerVariants({ isActive }))}
                            onClick={() => onImageClick(msg.id)}
                        >
                            <img
                                src={msg.imageUrl}
                                alt="Generated"
                                className="w-full h-auto rounded-xl object-contain"
                                loading="lazy"
                                decoding="async"
                            />
                        </div>

                        {/* Side Actions (Fade In) */}
                        <div className="flex flex-col gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={(e) => onDownload(e, msg.imageUrl!)}
                                        className="p-1.5 bg-muted hover:bg-card border border-border rounded-full text-muted-foreground hover:text-foreground shadow-sm transition-all"
                                    >
                                        <Icons.Download size={14} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    {t('download')}
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={(e) => onRegenerate(e, msg)}
                                        className="p-1.5 bg-muted hover:bg-card border border-border rounded-full text-muted-foreground hover:text-blue-600 shadow-sm transition-all"
                                    >
                                        <Icons.Regenerate size={14} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    {t('regenerate')}
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={(e) => onDelete(e, msg.id)}
                                        className="p-1.5 bg-muted hover:bg-card border border-border rounded-full text-muted-foreground hover:text-destructive shadow-sm transition-all"
                                    >
                                        <Icons.Trash size={14} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    {t('delete')}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                )}
            </div>

            {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-muted-foreground font-bold text-xs">
                    U
                </div>
            )}
        </div>
    );
});
