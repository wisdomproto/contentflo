'use client';

import { GripVertical, Trash2, Plus, RefreshCw, ImageIcon, Palette, ChevronDown, Wand2, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ImageLightbox } from './image-lightbox';
import type { InstagramCard } from '@/types/database';
import { useState } from 'react';
import { cn } from '@/lib/utils';

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
  isRegenerating?: boolean;
}

export function CardNewsCardItem({
  card, index, onUpdate, onDelete,
  onRegenerateImage, onGenerateImage,
  isRegenerating,
}: CardNewsCardItemProps) {
  const style = (card.text_style ?? {}) as {
    fontSize?: number;
    fontWeight?: string;
    textAlign?: string;
    color?: string;
  };

  const hasImage = !!card.background_image_url;
  const [showColorMode, setShowColorMode] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const useImage = hasImage && !showColorMode;

  return (
    <div className="group relative flex flex-col gap-2">
      {/* Slide preview */}
      <div
        className="relative aspect-square rounded-lg overflow-hidden flex items-center justify-center p-4 cursor-pointer"
        style={{
          backgroundColor: useImage ? undefined : (card.background_color ?? '#1a1a2e'),
        }}
        onClick={() => hasImage && setShowLightbox(true)}
      >
        {useImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.background_image_url!}
            alt={`슬라이드 ${index + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        <span className="absolute top-2 left-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 text-white/70 z-10">
          {index + 1}
        </span>

        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {hasImage && (
            <Button
              variant="ghost" size="sm"
              onClick={(e) => { e.stopPropagation(); setShowColorMode(!showColorMode); }}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-black/50 text-white"
            >
              {showColorMode ? <ImageIcon size={12} /> : <Palette size={12} />}
            </Button>
          )}
          {hasImage && (
            <Button
              variant="ghost" size="sm"
              onClick={(e) => { e.stopPropagation(); setShowLightbox(true); }}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-black/50 text-white"
            >
              <ZoomIn size={12} />
            </Button>
          )}
          {onRegenerateImage && (
            <Button
              variant="ghost" size="sm"
              onClick={(e) => { e.stopPropagation(); onRegenerateImage(); }}
              disabled={isRegenerating}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-black/50 text-white"
            >
              <RefreshCw size={12} className={isRegenerating ? 'animate-spin' : ''} />
            </Button>
          )}
          {!hasImage && onGenerateImage && (
            <Button
              variant="ghost" size="sm"
              onClick={(e) => { e.stopPropagation(); onGenerateImage(); }}
              disabled={isRegenerating}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-black/50 text-white"
            >
              <Wand2 size={12} />
            </Button>
          )}
          <Button
            variant="ghost" size="sm"
            onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 hover:bg-black/50 text-white"
          >
            <Trash2 size={12} />
          </Button>
        </div>

        <div className="absolute top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-white/50 cursor-grab z-10">
          <GripVertical size={14} />
        </div>

        {card.text_content && (
          <p
            className="whitespace-pre-line text-center break-words w-full relative z-10"
            style={{
              fontSize: `${Math.min((style.fontSize ?? 24) * 0.6, 18)}px`,
              fontWeight: style.fontWeight ?? 'bold',
              textAlign: (style.textAlign as 'center' | 'left') ?? 'center',
              color: style.color ?? '#ffffff',
              textShadow: useImage ? '0 1px 4px rgba(0,0,0,0.7)' : undefined,
            }}
          >
            {card.text_content}
          </p>
        )}

        {!card.text_content && !useImage && (
          <p className="text-xs text-white/40 relative z-10">텍스트를 입력하세요</p>
        )}
      </div>

      {/* Edit section */}
      <div className="space-y-2 px-1">
        <textarea
          value={card.text_content ?? ''}
          onChange={(e) => onUpdate(card.id, { text_content: e.target.value })}
          placeholder="슬라이드 텍스트 (선택)..."
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

        {/* Color picker */}
        <div className="flex gap-1 flex-wrap">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onUpdate(card.id, { background_color: color })}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: color,
                borderColor: card.background_color === color ? 'white' : 'transparent',
                boxShadow: card.background_color === color ? '0 0 0 2px hsl(var(--primary))' : undefined,
              }}
            />
          ))}
        </div>

        {/* Text style controls */}
        <div className="flex gap-1 text-[10px]">
          <button
            onClick={() => onUpdate(card.id, {
              text_style: { ...style, fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold' },
            })}
            className={`px-2 py-0.5 rounded border border-border ${style.fontWeight === 'bold' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            B
          </button>
          <button
            onClick={() => onUpdate(card.id, {
              text_style: { ...style, textAlign: style.textAlign === 'center' ? 'left' : 'center' },
            })}
            className="px-2 py-0.5 rounded border border-border hover:bg-muted"
          >
            {style.textAlign === 'center' ? '가운데' : '왼쪽'}
          </button>
          <select
            value={style.fontSize ?? 24}
            onChange={(e) => onUpdate(card.id, {
              text_style: { ...style, fontSize: Number(e.target.value) },
            })}
            className="px-1 py-0.5 rounded border border-border bg-transparent text-[10px]"
          >
            {[18, 20, 22, 24, 28, 32].map((s) => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lightbox */}
      {hasImage && (
        <ImageLightbox
          open={showLightbox}
          onOpenChange={setShowLightbox}
          src={card.background_image_url!}
          alt={`슬라이드 ${index + 1}`}
        />
      )}
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
