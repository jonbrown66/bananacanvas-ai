import React, { useState, useRef, useEffect } from 'react';
import { m as motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { Icons } from './Icons';
import { Message, PromptSuggestion } from '../types';
import { ChatMessageBubble } from './workspace/ChatMessageBubble';
import { Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { resolveImagePayload, resizeImageDataUrl, type ImageMimeType } from '@/services/geminiService';

interface ChatWorkspaceProps {
  messages: Message[];
  onSendMessage: (text: string, currentImageBase64?: string, aspectRatio?: "1:1" | "3:4" | "4:3" | "16:9" | "9:16", parentId?: string, isContextImage?: boolean, imageMimeType?: ImageMimeType) => void | Promise<void>;
  isProcessing: boolean;
  onDeleteMessage: (id: string, anchor?: { x: number; y: number }) => void | Promise<void>;
  onRegenerateMessage: (msg: Message) => void;
  latestImage: string | null;
  statusMessage?: string;
}



type AspectRatio = "Auto" | "1:1" | "3:4" | "4:3" | "16:9" | "9:16";



export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  messages,
  onSendMessage,
  isProcessing,
  onDeleteMessage,
  onRegenerateMessage,
  latestImage,
  statusMessage
}) => {
  const t = useTranslations('Chat');
  const locale = useLocale();
  const isChinese = locale === 'zh-CN';

  const ASPECT_RATIOS: { value: AspectRatio; label: string; icon: React.ReactNode }[] = [
    { value: "Auto", label: t('ratioAuto'), icon: <Icons.Ratio size={14} /> },
    { value: "1:1", label: t('ratioSquare'), icon: <Icons.Square size={14} /> },
    { value: "16:9", label: t('ratioLandscape'), icon: <Icons.Landscape size={14} /> },
    { value: "9:16", label: t('ratioPortrait'), icon: <Icons.Portrait size={14} /> },
    { value: "4:3", label: t('ratioClassic'), icon: <Icons.Landscape size={14} /> },
    { value: "3:4", label: t('ratioMobile'), icon: <Icons.Portrait size={14} /> },
  ];

  const SUGGESTIONS: PromptSuggestion[] = [
    { id: '1', label: t('suggestionCyberpunk'), prompt: t('suggestionCyberpunkPrompt') },
    { id: '2', label: t('suggestionWatercolor'), prompt: t('suggestionWatercolorPrompt') },
    { id: '3', label: t('suggestionClaymation'), prompt: t('suggestionClaymationPrompt') },
    { id: '4', label: t('suggestionMinimalist'), prompt: t('suggestionMinimalistPrompt') },
  ];
  const [inputValue, setInputValue] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>("Auto");
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const isNearBottomRef = useRef(true);

  // Auto-scroll only while the user is already near the bottom: generation
  // status updates change `messages` identity repeatedly, and unconditional
  // smooth scrolling used to yank the user back down while reading history.
  useEffect(() => {
    if (!isNearBottomRef.current) {
      setShowJumpToLatest(true);
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isProcessing]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      isNearBottomRef.current = nearBottom;
      if (nearBottom) setShowJumpToLatest(false);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const jumpToLatest = () => {
    isNearBottomRef.current = true;
    setShowJumpToLatest(false);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // When latestImage changes (new generation), automatically select it
  useEffect(() => {
    if (messages.length > 0) {
      // Find the last message with an image
      const lastImgMsg = [...messages].reverse().find(m => m.imageUrl);
      if (lastImgMsg) {
        setActiveMessageId(lastImgMsg.id);
      }
    }
  }, [messages.length, latestImage]);

  const getBestAspectRatio = (): "1:1" | "3:4" | "4:3" | "16:9" | "9:16" => {
    if (selectedRatio !== "Auto") return selectedRatio;

    if (!previewRef.current) return "1:1";
    const { width, height } = previewRef.current.getBoundingClientRect();
    const ratio = width / height;

    if (ratio > 1.6) return "16:9";
    if (ratio > 1.2) return "4:3";
    if (ratio < 0.6) return "9:16";
    if (ratio < 0.8) return "3:4";
    return "1:1";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawDataUrl = reader.result as string;
        const optimizedDataUrl = await resizeImageDataUrl(rawDataUrl);
        setUploadedImage(optimizedDataUrl);
        // Clear active selection when uploading new file
        setActiveMessageId(null);
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

  const getActiveImage = () => {
    if (uploadedImage) return uploadedImage;
    if (activeMessageId) {
      const msg = messages.find(m => m.id === activeMessageId);
      return msg?.imageUrl || latestImage; // Fallback
    }
    return latestImage;
  };

  const activeImage = getActiveImage();

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isProcessing) return;

    const imagePayload = await resolveImagePayload(activeImage);
    const targetRatio = getBestAspectRatio();

    // Determine if it is context image or uploaded image
    // If uploadedImage is present, it's NOT context (it's user provided)
    // If uploadedImage is null but base64 exists, it comes from history context
    const isContextImage = !uploadedImage && !!imagePayload?.base64;

    onSendMessage(inputValue, imagePayload?.base64, targetRatio, undefined, isContextImage, imagePayload?.mimeType);
    setInputValue('');
    clearUpload();
    // Do not reset aspect ratio, keep user preference
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageClick = React.useCallback((id: string) => {
    setActiveMessageId(id);
  }, []);

  const handleDownloadMessageImage = React.useCallback((e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    downloadImage(url);
  }, []);

  const handleRegenerateClick = React.useCallback((e: React.MouseEvent, msg: Message) => {
    e.stopPropagation();
    onRegenerateMessage(msg);
  }, [onRegenerateMessage]);

  const handleDeleteClick = React.useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteMessage(id, { x: e.clientX, y: e.clientY });
  }, [onDeleteMessage]);

  return (
    <div className="flex flex-col lg:flex-row flex-1 h-full overflow-hidden bg-muted/30">
      {/* Left: Conversation Area - 50% Width on desktop, 100% on mobile */}
      <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-border bg-background h-full lg:h-full relative z-10">

        {/* Messages List */}
        <div ref={scrollContainerRef} className="relative flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar [content-visibility:auto]">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Icons.Magic size={32} />
              </div>
              <p>{t('startPrompt')}</p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              msg={msg}
              isActive={activeMessageId === msg.id}
              t={t}
              isChinese={isChinese}
              onImageClick={handleImageClick}
              onDownload={handleDownloadMessageImage}
              onRegenerate={handleRegenerateClick}
              onDelete={handleDeleteClick}
            />
          ))}
          {isProcessing && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex-shrink-0 flex items-center justify-center text-white font-bold text-xs animate-pulse">
                AI
              </div>
              <div className="bg-card border border-border p-4 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                {statusMessage && (
                  <span className="text-xs text-muted-foreground animate-pulse">{statusMessage}</span>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />

          {/* Jump-to-latest pill: shown when the user scrolled up during generation */}
          {showJumpToLatest && (
            <div className="sticky bottom-2 flex justify-center pointer-events-none">
              <button
                type="button"
                onClick={jumpToLatest}
                className="pointer-events-auto h-8 px-3 rounded-full bg-background/95 border border-border shadow-md text-xs font-medium text-foreground hover:bg-muted active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Icons.Chat size={12} />
                {t('jumpToLatest')}
              </button>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-background relative">

          {/* Upload Preview */}
          {uploadedImage && (
            <div className="absolute bottom-full left-4 mb-2 p-2 bg-popover rounded-lg border border-border shadow-lg flex items-center gap-2">
              <div className="w-12 h-12 rounded bg-muted overflow-hidden">
                <img src={uploadedImage} alt="Upload" className="w-full h-full object-cover" decoding="async" />
              </div>
              <button onClick={clearUpload} aria-label="Clear upload" className="p-2 hover:bg-muted rounded-full text-muted-foreground">
                <Icons.SidebarClose size={14} className="rotate-45" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative group">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />

            {/* Left Tools */}
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={triggerFileUpload}
                    aria-label={t('uploadImage')}
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all shrink-0"
                  >
                    <Icons.New size={18} className="shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {t('uploadImage')}
                </TooltipContent>
              </Tooltip>

              {/* Ratio Dropdown */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={t('aspectRatio')}
                        className="h-9 px-2.5 rounded-lg flex items-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all shrink-0"
                      >
                        {ASPECT_RATIOS.find(r => r.value === selectedRatio)?.icon}
                        <span className="text-xs font-medium w-7 truncate text-left">{selectedRatio === 'Auto' ? t('ratioAuto') : selectedRatio}</span>
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {t('aspectRatio')}
                  </TooltipContent>
                </Tooltip>

                <DropdownMenuContent align="start" sideOffset={8} className="w-40 bg-popover/95 backdrop-blur-md shadow-xl rounded-xl p-1.5 border border-border/50">
                  {ASPECT_RATIOS.map(ratio => (
                    <DropdownMenuItem
                      key={ratio.value}
                      className={`flex items-center gap-2 cursor-pointer rounded-md ${selectedRatio === ratio.value ? 'text-primary focus:text-primary bg-primary/10 focus:bg-primary/20 font-medium' : ''}`}
                      onClick={() => setSelectedRatio(ratio.value)}
                    >
                      <span className="flex items-center gap-2 flex-1">
                        {ratio.icon}
                        <span>{ratio.label}</span>
                      </span>
                      {selectedRatio === ratio.value && <Check size={14} className="ml-2" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={uploadedImage ? t('describeChange') : (activeImage ? t('describeEdit') : t('describeGenerate'))}
              className="w-full pl-32 pr-12 py-3.5 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground placeholder-muted-foreground text-sm shadow-inner"
              disabled={isProcessing}
            />
            <button
              type="submit"
              aria-label={t('sending')}
              disabled={!inputValue.trim() || isProcessing}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 transition-all shrink-0 shadow-sm"
            >
              <Icons.Send size={16} className="shrink-0" />
            </button>
          </form>
        </div>
      </div>

      {/* Right: Preview & Tools - 50% Width on desktop, 100% on mobile */}
      <div className="w-full lg:w-1/2 bg-muted/30 flex flex-col h-1/2 lg:h-full">
        {/* Top: Image Preview */}
        <div className="flex-1 p-6 flex flex-col overflow-hidden">
          <h3 className="text-foreground font-medium mb-4 flex items-center gap-2 flex-shrink-0">
            <Icons.Image size={18} />
            {t('workspacePreview')} {activeMessageId ? `(${t('selected')})` : `(${t('latest')})`}
          </h3>
          {/* We ref this container to determine aspects */}
          <div ref={previewRef} className="flex-1 flex items-center justify-center overflow-hidden relative group p-4">
            <AnimatePresence mode="wait">
              {activeImage ? (
                <motion.div
                  key={activeImage}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="relative w-full h-full max-w-[90%] max-h-[90%] flex items-center justify-center"
                >
                  <div className="relative max-w-full max-h-full rounded-2xl overflow-hidden shadow-lg border border-border/80 bg-background flex items-center justify-center">
                    <img
                      src={activeImage}
                      alt="Active workspace"
                      className="max-w-full max-h-full object-contain transition-transform duration-300 hover:scale-[1.01]"
                      decoding="async"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full max-w-[90%] max-h-[90%] bg-muted/20 rounded-2xl border-2 border-dashed border-border/80 flex flex-col items-center justify-center text-center text-muted-foreground transition-all"
                >
                  <Icons.Image size={44} className="mx-auto mb-3 opacity-40" />
                  <span className="text-xs">{t('noImageSelected')}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom: Quick Prompts */}
        <div className="h-auto flex-shrink-0 border-t border-border p-5 bg-card">
          <h3 className="text-foreground font-semibold text-sm mb-3 flex items-center gap-2">
            <Icons.Magic size={16} className="text-primary" />
            {t('quickActions')}
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {SUGGESTIONS.map((sug) => (
              <button
                key={sug.id}
                onClick={() => setInputValue(sug.prompt)}
                className="text-left p-3 rounded-xl bg-muted/30 hover:bg-muted/70 border border-border/60 hover:border-border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98] group"
              >
                <span className="block text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{sug.label}</span>
                <span className="block text-[11px] text-muted-foreground truncate group-hover:text-foreground/80 mt-0.5">{sug.prompt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

