'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardNewsCardItem, AddSlideButton } from './cardnews-card-item';
import { ChannelModelSelector } from './channel-model-selector';
import { ChannelContentList } from './channel-content-list';
import { PromptEditDialog } from './prompt-edit-dialog';
import { useAiGeneration } from '@/hooks/use-ai-generation';
import { useImageGeneration, type ImagePrompt } from '@/hooks/use-image-generation';
import { useCardImageGeneration } from '@/hooks/use-card-image-generation';
import { useProjectStore } from '@/stores/project-store';
import { buildCardNewsImagePromptsPrompt } from '@/lib/prompt-builder';

import { Sparkles, Eye, Loader2, Hash, X, ImageIcon, Download, Upload } from 'lucide-react';
import type { Content, Project, InstagramContent, InstagramCard } from '@/types/database';
import { generateId, cn } from '@/lib/utils';

// ─── Inner: 개별 카드뉴스 콘텐츠 ────────────────────────────

interface CardNewsPanelInnerProps {
  igContent: InstagramContent;
  content: Content;
  project: Project;
  hasBaseArticle: boolean;
  channelModels: { textModel: string; imageModel: string; aspectRatio: string; imageStyle: string };
}

function CardNewsPanelInner({ igContent, content, project, hasBaseArticle, channelModels }: CardNewsPanelInnerProps) {
  const {
    getBaseArticle,
    getInstagramCards,
    updateInstagramContent,
    setInstagramCardsForContent,
    updateInstagramCard,
    deleteInstagramCard,
    addInstagramCard,
  } = useProjectStore();

  const baseArticle = getBaseArticle(content.id);
  const cards = getInstagramCards(igContent.id);

  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [caption, setCaption] = useState(igContent.caption ?? '');
  const [hashtagInput, setHashtagInput] = useState('');
  const hashtags = igContent.hashtags ?? [];

  // 해시태그 자동 세팅: 비어있으면 content.tags + 브랜드명으로 초기화
  useEffect(() => {
    if (hashtags.length > 0) return;
    const tags = content.tags ?? [];
    if (tags.length === 0) return;

    const autoHashtags = tags
      .map(t => t.replace(/\s+/g, '').replace(/^#/, ''))
      .filter(Boolean);

    // 브랜드명이 있으면 추가
    if (project.brand_name) {
      autoHashtags.push(project.brand_name.replace(/\s+/g, ''));
    }

    if (autoHashtags.length > 0) {
      updateInstagramContent(igContent.id, { hashtags: autoHashtags });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [igContent.id]);

  const imageStyle = channelModels.imageStyle || 'Photorealistic, high quality photography, natural lighting, detailed';
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isDraggingRef, setIsDraggingRef] = useState(false);
  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const refInputRef = useRef<HTMLInputElement>(null);

  const uploadRefImage = useCallback(async (file: File) => {
    setIsUploadingRef(true);
    try {
      const presignRes = await fetch('/api/storage/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          category: 'references',
          fileName: file.name,
          contentType: file.type,
          contentId: igContent.id,
        }),
      });
      if (!presignRes.ok) throw new Error('Presign 실패');
      const { presignedUrl, publicUrl } = await presignRes.json();
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!uploadRes.ok) throw new Error('R2 업로드 실패');
      setReferenceImage(publicUrl);
    } catch {
      // Fallback to base64
      const reader = new FileReader();
      reader.onload = () => setReferenceImage(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingRef(false);
    }
  }, [project.id, igContent.id]);

  // Step 1: 텍스트 AI로 이미지 프롬프트 생성
  const { isGenerating: isGeneratingPrompts, generate: generatePrompts, abort: abortPrompts } = useAiGeneration({
    onComplete: useCallback(
      (fullText: string) => {
        try {
          const jsonMatch = fullText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('JSON 형식을 찾을 수 없습니다.');
          const parsed = JSON.parse(jsonMatch[0]) as {
            caption: string;
            hashtags: string[];
            slides: { image_prompt: string; text_overlay: string }[];
          };

          const newCaption = parsed.caption || caption;
          const newHashtags = parsed.hashtags?.length ? parsed.hashtags : hashtags;
          setCaption(newCaption);
          updateInstagramContent(igContent.id, {
            caption: newCaption || null,
            hashtags: newHashtags,
          });

          const now = new Date().toISOString();
          const newCards: InstagramCard[] = parsed.slides.map((slide, i) => ({
            id: generateId('ic'),
            instagram_content_id: igContent.id,
            text_content: slide.text_overlay || null,
            background_color: '#1a1a2e',
            background_image_url: null,
            text_style: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#ffffff' },
            image_prompt: slide.image_prompt || null,
            reference_image_url: null,
            sort_order: i,
            created_at: now,
            updated_at: now,
          }));

          setInstagramCardsForContent(igContent.id, newCards);

          const imagePrompts: ImagePrompt[] = parsed.slides.map((slide, i) => ({
            slideIndex: i,
            prompt: slide.image_prompt,
            referenceImage: referenceImage || undefined,
            aspectRatio: (channelModels.aspectRatio || '1:1') as import('@/lib/ai/types').AspectRatio,
          }));
          startImageGeneration(imagePrompts, newCards, igContent.id);
        } catch {
          alert('카드뉴스 프롬프트 파싱 실패. 다시 시도해 주세요.');
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [igContent.id, caption, hashtags, referenceImage]
    ),
    onError: useCallback((err: string) => {
      alert(`AI 생성 오류: ${err}`);
    }, []),
  });

  const { isGenerating: isGeneratingImages, progress: imageProgress, generateImages, abort: abortImages } = useImageGeneration();

  const startImageGeneration = async (imagePrompts: ImagePrompt[], currentCards: InstagramCard[], igContentId: string) => {
    try {
      const results = await generateImages(imagePrompts, channelModels.imageModel);
      const state = useProjectStore.getState();
      const latestCards = state.getInstagramCards(igContentId);
      for (const result of results) {
        const card = latestCards[result.slideIndex] ?? currentCards[result.slideIndex];
        if (card) {
          state.updateInstagramCard(card.id, {
            background_image_url: `data:${result.mimeType};base64,${result.base64}`,
          });
        }
      }
    } catch (err) {
      alert(`이미지 생성 오류: ${(err as Error).message}`);
    }
  };

  const isGenerating = isGeneratingPrompts || isGeneratingImages;

  const handleGenerate = () => {
    const prompt = buildCardNewsImagePromptsPrompt({ project, content, baseArticle: baseArticle ?? undefined });
    setGeneratedPrompt(prompt);
    setShowPromptDialog(true);
  };

  const handleStartGeneration = (prompt: string) => {
    generatePrompts(prompt, channelModels.textModel);
  };

  const handleAbort = () => {
    abortPrompts();
    abortImages();
  };

  // 개별 카드 이미지 생성 (공통 훅)
  const { generateCardImage: generateSingleCardImage } = useCardImageGeneration({
    getPrompt: (card: InstagramCard) => {
      if (card.image_prompt) return imageStyle ? `${imageStyle}. ${card.image_prompt}` : card.image_prompt;
      return `Create an illustration for social media card: "${card.text_content || 'Slide'}". ${imageStyle}`;
    },
    getExistingImage: (card: InstagramCard) => card.background_image_url || null,
    saveResult: (cardId: string, dataUrl: string, prompt: string) => {
      updateInstagramCard(cardId, { background_image_url: dataUrl, image_prompt: prompt });
    },
    imageModel: channelModels.imageModel,
    aspectRatio: channelModels.aspectRatio || '1:1',
    imageStyle: imageStyle,
    referenceImage: referenceImage || undefined,
    projectId: project.id,
  });

  const handleGenerateCardImage = (cardId: string) => generateSingleCardImage(cardId, cards);

  const handleCardUpdate = (cardId: string, updates: Partial<InstagramCard>) => {
    updateInstagramCard(cardId, updates);
  };

  const handleCardDelete = (cardId: string) => {
    deleteInstagramCard(cardId);
  };

  const handleAddSlide = () => {
    addInstagramCard(igContent.id, cards.length);
  };

  const renderCardToBlob = (card: InstagramCard): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const size = 1080; // 인스타그램 정사각형
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      const drawText = () => {
        const text = card.text_content?.trim();
        if (!text) return;

        const style = (card.text_style ?? {}) as {
          fontSize?: number; fontWeight?: string; textAlign?: string; color?: string;
        };
        const fontSize = Math.round((style.fontSize ?? 24) * (size / 300)); // 스케일링
        const fontWeight = style.fontWeight ?? 'bold';
        const textAlign = (style.textAlign ?? 'center') as CanvasTextAlign;
        const color = style.color ?? '#ffffff';

        ctx.fillStyle = color;
        ctx.font = `${fontWeight} ${fontSize}px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`;
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'middle';

        // 텍스트 줄바꿈 처리
        const maxWidth = size * 0.85;
        const lines: string[] = [];
        const words = text.split('');
        let currentLine = '';
        for (const char of words) {
          const testLine = currentLine + char;
          if (ctx.measureText(testLine).width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);

        const lineHeight = fontSize * 1.4;
        const totalHeight = lines.length * lineHeight;
        const startY = (size - totalHeight) / 2 + lineHeight / 2;
        const x = textAlign === 'center' ? size / 2 : textAlign === 'right' ? size * 0.9 : size * 0.1;

        // 텍스트 그림자
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = fontSize * 0.15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = fontSize * 0.05;

        lines.forEach((line, idx) => {
          ctx.fillText(line, x, startY + idx * lineHeight);
        });

        ctx.shadowColor = 'transparent';
      };

      if (card.background_image_url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, 0, 0, size, size);
          drawText();
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png');
        };
        img.onerror = () => reject(new Error('이미지 로드 실패'));
        img.src = card.background_image_url;
      } else {
        // 배경색만 있는 경우
        ctx.fillStyle = card.background_color || '#1a1a2e';
        ctx.fillRect(0, 0, size, size);
        drawText();
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png');
      }
    });
  };

  const handleDownloadAllImages = async () => {
    if (cards.length === 0) {
      alert('다운로드할 카드가 없습니다.');
      return;
    }

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      // 이미지나 텍스트가 없는 빈 카드는 스킵
      if (!card.background_image_url && !card.text_content?.trim()) continue;
      try {
        const blob = await renderCardToBlob(card);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cardnews_${String(i + 1).padStart(2, '0')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.error(`카드 ${i + 1} 렌더링 실패:`, err);
      }
    }
  };

  const handleCaptionChange = (value: string) => {
    setCaption(value);
    updateInstagramContent(igContent.id, { caption: value || null });
  };

  const handleAddHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (!tag || hashtags.includes(tag)) return;
    const newTags = [...hashtags, tag];
    updateInstagramContent(igContent.id, { hashtags: newTags });
    setHashtagInput('');
  };

  const handleRemoveHashtag = (tag: string) => {
    const newTags = hashtags.filter((t) => t !== tag);
    updateInstagramContent(igContent.id, { hashtags: newTags });
  };

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {cards.length > 0 && <Badge variant="secondary" className="text-xs">{cards.length}장</Badge>}
          {isGeneratingPrompts && (
            <Badge variant="outline" className="text-xs gap-1 text-blue-600">
              <Loader2 size={10} className="animate-spin" /> 프롬프트 생성 중...
            </Badge>
          )}
          {isGeneratingImages && (
            <Badge variant="outline" className="text-xs gap-1 text-pink-600">
              <ImageIcon size={10} /> 이미지 {imageProgress.current}/{imageProgress.total}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={!hasBaseArticle || isGenerating}
            size="sm"
            className="gap-1.5 bg-pink-600 hover:bg-pink-700 text-white"
          >
            <Sparkles size={14} /> AI 생성
          </Button>
          {isGenerating && (
            <Button variant="destructive" size="sm" onClick={handleAbort}>중단</Button>
          )}
          {cards.some((c) => c.background_image_url) && (
            <Button variant="outline" size="sm" onClick={handleDownloadAllImages} className="gap-1.5">
              <Download size={14} /> 다운로드
            </Button>
          )}
        </div>
      </div>

      {/* Reference Image */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">참조 이미지</span>
        {referenceImage ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={referenceImage} alt="참조 이미지" className="w-12 h-12 object-cover rounded border border-border" />
              <button
                onClick={() => setReferenceImage(null)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80"
              >
                <X size={10} />
              </button>
            </div>
            <span className="text-[10px] text-muted-foreground">모든 카드 이미지 생성 시 이 스타일을 참조합니다</span>
          </div>
        ) : (
          <div
            onDrop={(e) => {
              e.preventDefault(); e.stopPropagation(); setIsDraggingRef(false);
              const file = e.dataTransfer.files[0];
              if (file?.type.startsWith('image/')) uploadRefImage(file);
            }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingRef(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingRef(false); }}
            onClick={() => !isUploadingRef && refInputRef.current?.click()}
            className={cn(
              'flex-1 h-12 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer transition-colors',
              isDraggingRef ? 'border-primary bg-primary/10' : 'border-muted-foreground/20 hover:border-primary/50',
              isUploadingRef && 'pointer-events-none opacity-50'
            )}
          >
            {isUploadingRef ? (
              <><Loader2 size={14} className="animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">업로드 중...</span></>
            ) : (
              <><Upload size={14} className="text-muted-foreground" /><span className="text-xs text-muted-foreground">이미지를 드래그하거나 클릭</span></>
            )}
          </div>
        )}
        <input ref={refInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file?.type.startsWith('image/')) uploadRefImage(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* No base article */}
      {!hasBaseArticle && (
        <p className="text-sm text-muted-foreground">기본 글을 먼저 작성해 주세요.</p>
      )}

      {/* Caption & Hashtags */}
      {hasBaseArticle && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <h3 className="text-xs font-semibold">캡션 & 해시태그</h3>
          <textarea
            value={caption}
            onChange={(e) => handleCaptionChange(e.target.value)}
            placeholder="인스타그램 캡션을 입력하세요..."
            className="w-full text-sm border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary bg-transparent resize-none"
            rows={3}
          />
          <div>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Hash size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddHashtag(); } }}
                  placeholder="해시태그 입력 후 Enter"
                  className="w-full text-sm border border-border rounded-md pl-7 pr-3 py-1.5 focus:outline-none focus:border-primary bg-transparent"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleAddHashtag}>추가</Button>
            </div>
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                    #{tag}
                    <button onClick={() => handleRemoveHashtag(tag)} className="hover:text-destructive">
                      <X size={10} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide Grid */}
      {cards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {cards.map((card) => (
            <CardNewsCardItem
              key={card.id}
              card={card}
              index={card.sort_order}
              onUpdate={handleCardUpdate}
              onDelete={handleCardDelete}
              onRegenerateImage={card.image_prompt ? () => handleGenerateCardImage(card.id) : undefined}
              onGenerateImage={() => handleGenerateCardImage(card.id)}
              isRegenerating={isGeneratingImages}
            />
          ))}
          <AddSlideButton onAdd={handleAddSlide} />
        </div>
      )}

      {cards.length === 0 && hasBaseArticle && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          <AddSlideButton onAdd={handleAddSlide} />
        </div>
      )}

      <PromptEditDialog
        open={showPromptDialog}
        onOpenChange={setShowPromptDialog}
        initialPrompt={generatedPrompt}
        isGenerating={isGeneratingPrompts}
        onGenerate={handleStartGeneration}
        onAbort={handleAbort}
      />
    </div>
  );
}

// ─── Outer: 다중 카드뉴스 콘텐츠 리스트 ────────────────────────────

export function CardNewsPanel() {
  const { selectedContentId, contents, selectedProjectId, projects, getBaseArticle, getInstagramContents, addInstagramContent, updateInstagramContent, deleteInstagramContent, getChannelModels, setChannelModels } = useProjectStore();
  const content = contents.find((c) => c.id === selectedContentId);
  const project = projects.find((p) => p.id === selectedProjectId);
  if (!content || !project) return null;
  const hasBaseArticle = !!getBaseArticle(content.id);
  const igContents = getInstagramContents(content.id);
  const channelModels = getChannelModels(project.id, 'cardnews');

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">인스타그램 카드뉴스</h2>
      </div>

      <ChannelModelSelector
        textModel={channelModels.textModel}
        imageModel={channelModels.imageModel}
        onTextModelChange={(m) => setChannelModels(project.id, 'cardnews', { textModel: m })}
        onImageModelChange={(m) => setChannelModels(project.id, 'cardnews', { imageModel: m })}
        aspectRatio={channelModels.aspectRatio}
        onAspectRatioChange={(r) => setChannelModels(project.id, 'cardnews', { aspectRatio: r })}
        imageStyle={channelModels.imageStyle}
        onImageStyleChange={(s) => setChannelModels(project.id, 'cardnews', { imageStyle: s })}
        defaultAspectRatio="1:1"
      />

      <ChannelContentList<InstagramContent>
        items={igContents}
        getId={(item) => item.id}
        getTitle={(item, index) => item.title || `카드뉴스 ${index + 1}`}
        onTitleChange={(id, title) => updateInstagramContent(id, { title })}
        onAdd={() => addInstagramContent(content.id)}
        onDelete={(id) => deleteInstagramContent(id)}
        addLabel="새 카드뉴스 추가"
        renderContent={(igContent) => (
          <CardNewsPanelInner
            key={igContent.id}
            igContent={igContent}
            content={content}
            project={project}
            hasBaseArticle={hasBaseArticle}
            channelModels={channelModels}
          />
        )}
      />
    </div>
  );
}
