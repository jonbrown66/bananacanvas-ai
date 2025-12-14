
import React, { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import { Message } from '../types';
import { Icons } from './Icons';
import ReactMarkdown from 'react-markdown';

interface CanvasWorkspaceProps {
  messages: Message[];
  onSendMessage: (text: string, currentImageBase64?: string, aspectRatio?: any, parentId?: string, isContextImage?: boolean) => void | Promise<void>;
  onUpdateNodePosition: (id: string, pos: { x: number, y: number }) => void | Promise<void>;
  onAutoLayout: (positions: Record<string, { x: number, y: number }>) => void | Promise<void>;
  isProcessing: boolean;
  onDeleteMessage: (id: string) => void | Promise<void>;
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
  const [scale, setScale] = useState(0.8);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [canvasDragStart, setCanvasDragStart] = useState({ x: 0, y: 0 });
  const [promptInput, setPromptInput] = useState('');

  // File Upload State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selection and Node Dragging
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [nodeDragOffset, setNodeDragOffset] = useState({ x: 0, y: 0 });
  const [localNodePositions, setLocalNodePositions] = useState<Record<string, { x: number, y: number }>>({});

  // Menu State
  const [activeMenuNodeId, setActiveMenuNodeId] = useState<string | null>(null);

  useEffect(() => {
    // Sync props to local state if not dragging
    if (!draggingNodeId) {
      const positions: Record<string, { x: number, y: number }> = {};
      messages.forEach(m => {
        if (m.position) positions[m.id] = m.position;
      });
      setLocalNodePositions(positions);
    }
  }, [messages, draggingNodeId]);

  useEffect(() => {
    if (!selectedNodeId && messages.length > 0) {
      setSelectedNodeId(messages[messages.length - 1].id);
    }
  }, [messages.length]);

  // Click outside to close menus
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.node-menu-trigger') && !target.closest('.node-menu-content')) {
        setActiveMenuNodeId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);


  const getEffectivePosition = (msg: Message) => {
    return localNodePositions[msg.id] || msg.position || { x: 0, y: 0 };
  };

  const selectedMessage = messages.find(m => m.id === selectedNodeId);

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom on wheel scroll
    const delta = e.deltaY * -0.001;
    setScale(prev => Math.min(Math.max(0.1, prev + delta), 4));
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-interactive')) return;

    setIsDraggingCanvas(true);
    setCanvasDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    setSelectedNodeId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    setSelectedNodeId(msgId);
    setDraggingNodeId(msgId);

    const pos = getEffectivePosition(msg);
    setNodeDragOffset({
      x: e.clientX / scale - pos.x,
      y: e.clientY / scale - pos.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas) {
      setPosition({
        x: e.clientX - canvasDragStart.x,
        y: e.clientY - canvasDragStart.y
      });
    } else if (draggingNodeId) {
      const newX = e.clientX / scale - nodeDragOffset.x;
      const newY = e.clientY / scale - nodeDragOffset.y;
      setLocalNodePositions(prev => ({
        ...prev,
        [draggingNodeId]: { x: newX, y: newY }
      }));
    }
  };

  const handleMouseUp = () => {
    if (draggingNodeId && localNodePositions[draggingNodeId]) {
      onUpdateNodePosition(draggingNodeId, localNodePositions[draggingNodeId]);
    }
    setIsDraggingCanvas(false);
    setDraggingNodeId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
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

  const handleFloatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isProcessing) return;

    // Priority: Uploaded Image > Selected Node Image
    const imageToUse = uploadedImage || selectedMessage?.imageUrl;
    const base64 = imageToUse ? imageToUse.split(',')[1] : undefined;

    const isContextImage = !uploadedImage && !!base64;

    onSendMessage(promptInput, base64, "1:1", selectedNodeId || undefined, isContextImage);
    setPromptInput('');
    clearUpload();
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `generated - ${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

    let globalY = 0;

    const layoutNode = (nodeId: string, depth: number) => {
      const children = messages.filter(m => m.parentId === nodeId);
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
      globalY += NODE_HEIGHT; // Gap between trees
    });

    onAutoLayout(newPositions);
  };

  // Render Connections with Cubic Bezier
  const renderConnections = () => {
    const NODE_WIDTH = 380;
    const NODE_HEADER_HEIGHT = 60; // Approximate point where line should connect

    return messages.map(msg => {
      if (!msg.parentId) return null;
      const parent = messages.find(p => p.id === msg.parentId);
      if (!parent) return null;

      const start = getEffectivePosition(parent);
      const end = getEffectivePosition(msg);

      const startX = start.x + NODE_WIDTH;
      const startY = start.y + NODE_HEADER_HEIGHT;
      const endX = end.x;
      const endY = end.y + NODE_HEADER_HEIGHT;

      const dist = Math.abs(endX - startX);
      const controlPointOffset = Math.max(dist * 0.5, 100);

      return (
        <svg key={`conn - ${msg.id} `} className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-0">
          {/* Connection Line */}
          <path
            d={`M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY} `}
            stroke="hsl(var(--border))"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          {/* Start Dot */}
          <circle cx={startX} cy={startY} r="4" fill="hsl(var(--muted-foreground))" />
          {/* End Arrow/Dot */}
          <circle cx={endX} cy={endY} r="4" fill="hsl(var(--muted-foreground))" />
        </svg>
      );
    });
  };

  return (
    <div
      className="flex-1 h-full relative bg-muted/30 overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)',
          backgroundSize: `${20 * scale}px ${20 * scale} px`,
          transform: `translate(${position.x % (20 * scale)}px, ${position.y % (20 * scale)}px)`
        }}
      />

      <div
        className="absolute inset-0 origin-center"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
        }}
      >
        {renderConnections()}

        {messages.map((msg) => {
          const pos = getEffectivePosition(msg);
          const isSelected = selectedNodeId === msg.id;
          const isMenuOpen = activeMenuNodeId === msg.id;

          return (
            <div
              key={msg.id}
              className={`node-interactive absolute w-[380px] transition-shadow duration-200 group`}
              style={{
                left: pos.x,
                top: pos.y,
                zIndex: isSelected ? 10 : 1
              }}
              onMouseDown={(e) => handleNodeMouseDown(e, msg.id)}
            >
              <div className={`flex flex-col rounded-2xl border bg-card overflow-visible transition-all duration-200 ${isSelected
                ? 'border-primary shadow-2xl ring-4 ring-primary/10 scale-[1.01]'
                : 'border-border shadow-lg hover:border-primary/50'
                } `}>
                {/* Header Handle */}
                <div className={`px-4 py-3 flex items-center justify-between border-b rounded-t-2xl ${msg.role === 'user' ? 'bg-muted/50 border-border' : 'bg-gradient-to-r from-primary/10 to-card border-primary/20'
                  } `}>
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shadow-sm ${msg.role === 'user' ? 'bg-card text-muted-foreground border border-border' : 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white'
                      } `}>
                      {msg.role === 'user' ? 'U' : 'AI'}
                    </div>
                    <span className={`text-xs font-semibold text-muted-foreground uppercase ${isChinese ? '' : 'tracking-wide'}`}>
                      {msg.role === 'user' ? t('prompt') : t('result')}
                    </span>
                  </div>

                  {/* Menu Trigger */}
                  <div className="relative node-interactive">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuNodeId(isMenuOpen ? null : msg.id);
                      }}
                      className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground node-menu-trigger"
                    >
                      <Icons.More size={16} />
                    </button>

                    {/* Dropdown Menu */}
                    {isMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-popover rounded-xl shadow-xl border border-border z-50 overflow-hidden node-menu-content animate-in fade-in zoom-in-95 duration-100">
                        {msg.imageUrl && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); downloadImage(msg.imageUrl!); setActiveMenuNodeId(null); }}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-muted flex items-center gap-3 text-foreground"
                            >
                              <Icons.Download size={14} /> {tChat('download')}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onRegenerateMessage(msg); setActiveMenuNodeId(null); }}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-muted flex items-center gap-3 text-blue-600"
                            >
                              <Icons.Regenerate size={14} /> {tChat('regenerate')}
                            </button>
                          </>
                        )}
                        <div className="h-px bg-border my-1"></div>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteMessage(msg.id); setActiveMenuNodeId(null); }}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-destructive/10 flex items-center gap-3 text-destructive"
                        >
                          <Icons.Trash size={14} /> {tChat('delete')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 bg-card relative group-node-content rounded-b-2xl">
                  {(!msg.imageUrl || msg.role === 'user') && (
                    <div className={`text-sm text-card-foreground leading-relaxed line-clamp-6 mb-2 ${isChinese ? '' : 'font-serif'}`}>
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  )}

                  {msg.imageUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-border bg-muted group-hover:shadow-md transition-shadow">
                      <Image
                        src={msg.imageUrl}
                        alt="Node content"
                        width={0}
                        height={0}
                        sizes="100vw"
                        className="w-full h-auto object-cover max-h-[400px] pointer-events-none"
                        draggable={false}
                      />
                    </div>
                  )}
                </div>

                {/* Footer Stats/Time */}
                <div className="px-4 py-2 bg-muted/30 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground">
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isSelected && <span className="text-orange-500 font-medium">{t('active')}</span>}
                </div>
              </div>
            </div>
          );
        })}

        {isProcessing && selectedMessage && (
          <div
            className="absolute flex items-center gap-2 p-3 bg-popover rounded-full shadow-xl border border-border z-50 animate-bounce"
            style={{
              left: (getEffectivePosition(selectedMessage).x + 400),
              top: getEffectivePosition(selectedMessage).y + 60
            }}
          >
            <Icons.Magic size={20} className="text-primary animate-spin" />
            <span className="text-xs font-medium text-muted-foreground">
              {statusMessage || t('generating')}
            </span>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[600px] max-w-[90%] node-interactive cursor-auto" onMouseDown={e => e.stopPropagation()}>
        {/* Upload Preview */}
        {uploadedImage && (
          <div className="absolute bottom-full left-0 mb-2 p-2 bg-background/90 backdrop-blur rounded-lg border border-border shadow-lg flex items-center gap-2">
            <div className="w-12 h-12 rounded bg-muted overflow-hidden">
              <Image src={uploadedImage} alt="Upload" fill className="object-cover" />
            </div>
            <button onClick={clearUpload} className="p-1 hover:bg-muted rounded-full text-muted-foreground">
              <Icons.SidebarClose size={14} className="rotate-45" />
            </button>
          </div>
        )}

        <form
          onSubmit={handleFloatingSubmit}
          className="bg-background/90 backdrop-blur-xl p-3 rounded-2xl shadow-2xl border border-border/50 flex gap-2 ring-1 ring-border/5"
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />

          <button
            type="button"
            onClick={triggerFileUpload}
            className="p-3 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl transition-colors"
            title={tChat('uploadImage')}
          >
            <Icons.New size={20} />
          </button>

          <div className="flex flex-col flex-1 pl-2 justify-center">
            {!promptInput && (
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  {selectedMessage ? t('branching') : t('newRoot')}
                </span>
              </div>
            )}
            {/* Updated input style: outline-none and no border */}
            <input
              type="text"
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              placeholder={uploadedImage ? t('editUploaded') : (selectedMessage?.imageUrl ? t('describeChanges') : t('createNew'))}
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 px-0 py-0 text-foreground placeholder-muted-foreground font-medium text-base shadow-none ring-0"
              disabled={isProcessing}
            />
          </div>
          <button
            type="submit"
            disabled={!promptInput.trim() || isProcessing}
            className="bg-primary text-primary-foreground p-3.5 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 shadow-md hover:scale-105 active:scale-95"
          >
            <Icons.Send size={20} />
          </button>
        </form>
      </div>

      {/* Right Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 node-interactive">
        <button onClick={() => setScale(0.8)} className="bg-card p-2 rounded-lg shadow-md border border-border hover:bg-muted text-muted-foreground font-mono text-xs">
          {Math.round(scale * 100)}%
        </button>
      </div>

      {/* Bottom Right Auto Layout Button */}
      <div className="absolute bottom-4 right-4 node-interactive">
        <button
          onClick={performAutoLayout}
          className="bg-card p-3 rounded-full shadow-lg border border-border hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all"
          title={t('autoLayout')}
        >
          <Icons.AutoLayout size={20} />
        </button>
      </div>
    </div>
  );
};
