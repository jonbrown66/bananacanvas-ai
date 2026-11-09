import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { m as motion } from 'framer-motion';
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
    "relative rounded-2xl overflow-hidden border transition-all cursor-pointer select-none max-w-[150px] bg-muted/20",
    {
        variants: {
            isActive: {
                true: "border-primary ring-2 ring-primary/25 shadow-md",
                false: "border-border/80 hover:border-primary/50 shadow-sm"
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
        <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
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
                    <div className="flex items-start gap-2.5 group">
                        {/* Image Container - Concentric 16px radius with overflow clipping */}
                        <div
                            className={cn(imageContainerVariants({ isActive }))}
                            onClick={() => onImageClick(msg.id)}
                        >
                            <img
                                src={msg.imageUrl}
                                alt="Generated"
                                className="w-full h-auto block object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                loading="lazy"
                                decoding="async"
                            />
                        </div>

                        {/* Side Actions - Integrated Glass Pill Toolbar with Concentric 12px/8px radii and perfect centering */}
                        <div className="flex flex-col gap-0.5 p-1 bg-card/90 dark:bg-card/85 backdrop-blur-md border border-border/80 rounded-xl shadow-sm self-start opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-all duration-150">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={(e) => onDownload(e, msg.imageUrl!)}
                                        aria-label={t('download')}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-90 transition-all"
                                    >
                                        <Icons.Download size={14} className="shrink-0" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    {t('download')}
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={(e) => onRegenerate(e, msg)}
                                        aria-label={t('regenerate')}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 active:scale-90 transition-all"
                                    >
                                        <Icons.Regenerate size={14} className="shrink-0" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    {t('regenerate')}
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={(e) => onDelete(e, msg.id)}
                                        aria-label={t('delete')}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-90 transition-all"
                                    >
                                        <Icons.Trash size={14} className="shrink-0" />
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
        </motion.div>
    );
});
