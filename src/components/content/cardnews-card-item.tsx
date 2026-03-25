'use client';

import { GripVertical, Trash2, Plus, ChevronDown, Loader2 } from 'lucide-react';
import { ImageCardWidget } from './image-card-widget';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { InstagramCard } from '@/types/database';
import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface CardTextStyle {
  fontSize?: number;
  fontWeight?: string;
  textAlign?: string;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  bgEnabled?: boolean;
  bgOpacity?: number;
  bgBlur?: number;
  bgColor?: string;
  bgBorderColor?: string;
  boxX?: number;
  boxY?: number;
  boxW?: number;
  boxH?: number;
  headline?: string;
  body?: string;
  headlineBodyGap?: number;
  headlineFontSize?: number;
  bodyFontSize?: number;
  layoutType?: 'standard' | 'text-only' | 'photo-bg' | 'split-top' | 'split-left';
  bgGradient?: string;
  accentColor?: string;
  aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9';
  textPosition?: 'top' | 'center' | 'bottom';
}

export function getAspectRatioCSS(ratio: string): string {
  const map: Record<string, string> = { '1:1': '1/1', '4:5': '4/5', '9:16': '9/16', '16:9': '16/9' };
  return map[ratio] || '4/5';
}

/** Shared text overlay renderer — used in card preview and fullscreen preview */
export function CardTextOverlay({ style, hasImage, scale = 1 }: { style: CardTextStyle; hasImage: boolean; scale?: number }) {
  const headlineFontSize = (style.headlineFontSize ?? 20) * scale;
  const bodyFontSize = (style.bodyFontSize ?? 13) * scale;
  const fallbackFontSize = (style.fontSize ?? 18) * scale;
  const textAlign = (style.textAlign as 'center' | 'left') ?? 'center';
  const color = style.color ?? '#ffffff';
  const stroke = style.strokeWidth ? `${style.strokeWidth * scale}px ${style.strokeColor || '#000000'}` : undefined;
  const shadow = !style.strokeWidth && hasImage ? '0 1px 4px rgba(0,0,0,0.7)' : undefined;

  return (
    <>
      <div className="w-full relative z-10 px-2 flex flex-col" style={{ gap: `${(style.headlineBodyGap ?? 4) * scale}px` }}>
        {style.headline && (
          <p className="whitespace-pre-line break-words w-full" style={{ fontSize: `${headlineFontSize}px`, fontWeight: 'bold', textAlign, color, WebkitTextStroke: stroke, textShadow: shadow, lineHeight: 1.3 }}>
            {style.headline}
          </p>
        )}
        {style.body && (
          <p className="whitespace-pre-line break-words w-full" style={{ fontSize: `${bodyFontSize}px`, fontWeight: 'normal', textAlign, color, opacity: 0.9, WebkitTextStroke: stroke ? `${Math.max(0.5, (style.strokeWidth || 1) * 0.7 * scale)}px ${style.strokeColor || '#000000'}` : undefined, textShadow: shadow, lineHeight: 1.4 }}>
            {style.body}
          </p>
        )}
        {!style.headline && !style.body && (
          <p className="whitespace-pre-line break-words w-full" style={{ fontSize: `${fallbackFontSize}px`, fontWeight: style.fontWeight ?? 'bold', textAlign, color, WebkitTextStroke: stroke, textShadow: shadow }}>
            {/* fallback: rendered by parent passing text_content */}
          </p>
        )}
      </div>
    </>
  );
}

const PRESET_COLORS = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483',
  '#e94560', '#2d6a4f', '#d4a373', '#264653',
  '#e76f51', '#023047',
];

interface CardNewsCardItemProps {
  card: InstagramCard;
  index: number;
  onUpdate: (cardId: string, updates: Partial<InstagramCard>) => void;
  onDelete: (cardId: string) => void;
  onRegenerateImage?: () => void;
  onGenerateImage?: () => void;
  isRegeneratingThis?: boolean;
  isAnyRegenerating?: boolean;
}

export function CardNewsCardItem({
  card, index, onUpdate, onDelete,
  onRegenerateImage, onGenerateImage,
  isRegeneratingThis, isAnyRegenerating,
}: CardNewsCardItemProps) {
  const style = (card.text_style ?? {}) as CardTextStyle;

  const [showPrompt, setShowPrompt] = useState(false);

  // Drag / Resize state
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startBoxX: number; startBoxY: number; mode: 'move' | 'resize'; startBoxW: number; startBoxH: number } | null>(null);
  const didDragRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    didDragRef.current = false;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startBoxX: style.boxX ?? 5, startBoxY: style.boxY ?? 20,
      startBoxW: style.boxW ?? 90, startBoxH: style.boxH ?? 60,
      mode,
    };
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current || !rect) return;
      didDragRef.current = true;
      const dx = ((ev.clientX - dragRef.current.startX) / rect.width) * 100;
      const dy = ((ev.clientY - dragRef.current.startY) / rect.height) * 100;
      if (dragRef.current.mode === 'move') {
        const newX = Math.max(0, Math.min(100 - (style.boxW ?? 90), dragRef.current.startBoxX + dx));
        const newY = Math.max(0, Math.min(100 - (style.boxH ?? 60), dragRef.current.startBoxY + dy));
        onUpdate(card.id, { text_style: { ...style, boxX: Math.round(newX), boxY: Math.round(newY) } });
      } else {
        const newW = Math.max(20, Math.min(100 - (style.boxX ?? 5), dragRef.current.startBoxW + dx));
        const newH = Math.max(15, Math.min(100 - (style.boxY ?? 20), dragRef.current.startBoxH + dy));
        onUpdate(card.id, { text_style: { ...style, boxW: Math.round(newW), boxH: Math.round(newH) } });
      }
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [card.id, style, onUpdate]);


  const layout = style.layoutType || 'standard';
  const bgStyle = style.bgGradient
    ? { background: style.bgGradient }
    : { backgroundColor: style.bgColor || card.background_color || '#1a1a2e' };
  const ar = getAspectRatioCSS(style.aspectRatio || '4/5');

  const deleteBtn = (
    <div className="absolute top-2 right-2 z-10">
      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-black/50 text-white">
        <Trash2 size={12} />
      </Button>
    </div>
  );

  const indexBadge = (
    <span className="absolute top-2 left-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-white/70 z-10">
      {index + 1}
    </span>
  );

  const textEmpty = <p className="text-xs opacity-40" style={{ color: style.color || '#ffffff' }}>텍스트를 입력하세요</p>;

  const uploadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => onUpdate(card.id, { background_image_url: reader.result as string });
    reader.readAsDataURL(file);
  };

  const renderCardPreview = () => {
    // ─── Text Only ───
    if (layout === 'text-only') {
      return (
        <div ref={containerRef} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: ar, ...bgStyle }}>
          {indexBadge}
          {style.accentColor && (
            <div className="absolute top-3 left-3 w-8 h-1 rounded z-10" style={{ backgroundColor: style.accentColor }} />
          )}
          <div className={cn(
            'absolute inset-0 flex p-5 z-[1]',
            style.textPosition === 'center' ? 'items-center justify-center' : style.textPosition === 'top' ? 'items-start justify-center pt-12' : 'items-end justify-center pb-8'
          )}>
            {card.text_content ? <CardTextOverlay style={style} hasImage={false} /> : textEmpty}
          </div>
          {deleteBtn}
        </div>
      );
    }

    // ─── Photo Background ───
    if (layout === 'photo-bg') {
      return (
        <div ref={containerRef} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: ar, ...bgStyle }}>
          {indexBadge}
          {card.background_image_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.background_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70" />
            </>
          ) : (
            <div className="absolute inset-0">
              <ImageCardWidget
                src={null} alt={`슬라이드 ${index + 1}`} aspectClass="h-full"
                isGenerating={isRegeneratingThis} onRegenerate={onRegenerateImage}
                onDelete={() => {}} onUpload={uploadImage}
                placeholder="배경 이미지 생성 또는 업로드"
              />
            </div>
          )}
          <div className={cn(
            'absolute inset-x-0 p-4 z-10',
            style.textPosition === 'center' ? 'inset-0 flex items-center justify-center' : 'bottom-0'
          )}>
            {card.text_content ? <CardTextOverlay style={{ ...style, color: style.color || '#ffffff' }} hasImage={true} /> : textEmpty}
          </div>
          {deleteBtn}
        </div>
      );
    }

    // ─── Split Top (image top, text bottom) ───
    if (layout === 'split-top') {
      return (
        <div ref={containerRef} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: ar, ...bgStyle }}>
          {indexBadge}
          <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: '50%' }}>
            <ImageCardWidget
              src={card.background_image_url || null} alt={`슬라이드 ${index + 1}`} aspectClass="h-full"
              isGenerating={isRegeneratingThis} onRegenerate={onRegenerateImage}
              onDelete={() => onUpdate(card.id, { background_image_url: null })}
              onUpload={uploadImage}
              onRestore={(url) => onUpdate(card.id, { background_image_url: url })}
              placeholder="이미지"
            />
          </div>
          {style.accentColor && (
            <div className="absolute left-3 z-10" style={{ top: '50%', marginTop: 8 }}>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ color: style.accentColor }}>{style.accentColor === '#E74C3C' ? 'ARTICLE' : '●'}</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center p-4" style={{ height: '50%' }}>
            {card.text_content ? <CardTextOverlay style={style} hasImage={false} /> : textEmpty}
          </div>
          {deleteBtn}
        </div>
      );
    }

    // ─── Split Left (text left, image right) ───
    if (layout === 'split-left') {
      return (
        <div ref={containerRef} className="relative rounded-lg overflow-hidden flex" style={{ aspectRatio: ar, ...bgStyle }}>
          {indexBadge}
          <div className="w-1/2 flex items-center p-3 z-[1]">
            {card.text_content ? <CardTextOverlay style={style} hasImage={false} /> : textEmpty}
          </div>
          <div className="w-1/2 overflow-hidden">
            <ImageCardWidget
              src={card.background_image_url || null} alt={`슬라이드 ${index + 1}`} aspectClass="h-full"
              isGenerating={isRegeneratingThis} onRegenerate={onRegenerateImage}
              onDelete={() => onUpdate(card.id, { background_image_url: null })}
              onUpload={uploadImage}
              onRestore={(url) => onUpdate(card.id, { background_image_url: url })}
              placeholder="이미지"
            />
          </div>
          {deleteBtn}
        </div>
      );
    }

    // ─── Standard (default: top 40% text, bottom 60% image) ───
    return (
      <div ref={containerRef} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: ar, ...bgStyle }}>
        <div className="absolute inset-x-0 top-0 flex items-center justify-center p-3 group/textbox" style={{ height: '40%' }}>
          {indexBadge}
          {card.text_content ? (
            <div className="relative w-full h-full flex items-center justify-center cursor-move" onPointerDown={(e) => handlePointerDown(e, 'move')}>
              <div className="absolute inset-0 border border-dashed border-white/0 group-hover/textbox:border-white/30 rounded-lg pointer-events-none transition-colors" />
              <CardTextOverlay style={style} hasImage={false} />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 cursor-se-resize opacity-0 group-hover/textbox:opacity-100 transition-opacity z-20" onPointerDown={(e) => handlePointerDown(e, 'resize')}>
                <svg viewBox="0 0 20 20" className="w-full h-full"><path d="M18 10 L10 18 M18 14 L14 18 M18 18 L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" /></svg>
              </div>
            </div>
          ) : (
            <p className="text-xs text-white/40">텍스트를 입력하세요</p>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ height: '60%' }}>
          <ImageCardWidget
            src={card.background_image_url || null} alt={`슬라이드 ${index + 1}`} aspectClass="h-full"
            isGenerating={isRegeneratingThis} onRegenerate={onRegenerateImage}
            onDelete={() => onUpdate(card.id, { background_image_url: null })}
            onUpload={uploadImage}
            onRestore={(url) => onUpdate(card.id, { background_image_url: url })}
            placeholder="이미지 생성 또는 업로드"
          />
        </div>
        {deleteBtn}
      </div>
    );
  };

  return (
    <div className="group relative flex flex-col gap-2">
      {renderCardPreview()}

      {/* Edit section */}
      <div className="space-y-2 px-1">
        <input
          value={style.headline ?? ''}
          onChange={(e) => {
            const h = e.target.value;
            const combined = [h, style.body || ''].filter(Boolean).join('\n');
            onUpdate(card.id, { text_content: combined || null, text_style: { ...style, headline: h } });
          }}
          placeholder="헤드라인 (10~15자)"
          className="w-full text-xs font-bold bg-transparent border border-border rounded-md px-2 py-1 focus:outline-none focus:border-primary"
        />
        <textarea
          value={style.body ?? ''}
          onChange={(e) => {
            const b = e.target.value;
            const combined = [style.headline || '', b].filter(Boolean).join('\n');
            onUpdate(card.id, { text_content: combined || null, text_style: { ...style, body: b } });
          }}
          placeholder="본문 (30~50자)"
          className="w-full text-xs bg-transparent border border-border rounded-md px-2 py-1.5 resize-none focus:outline-none focus:border-primary"
          rows={2}
        />

        {/* Image prompt toggle */}
        <div>
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            <ChevronDown size={10} className={cn('transition-transform', !showPrompt && '-rotate-90')} />
            프롬프트
          </button>
          {showPrompt && (
            <Textarea
              value={card.image_prompt ?? ''}
              onChange={(e) => onUpdate(card.id, { image_prompt: e.target.value })}
              placeholder="이미지 생성 프롬프트..."
              className="mt-1 h-14 resize-none overflow-y-auto text-[10px]"
            />
          )}
        </div>
      </div>

    </div>
  );
}

interface AddSlideButtonProps {
  onAdd: () => void;
}

export function AddSlideButton({ onAdd }: AddSlideButtonProps) {
  return (
    <button
      onClick={onAdd}
      className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
    >
      <Plus size={20} />
      <span className="text-xs">슬라이드 추가</span>
    </button>
  );
}
