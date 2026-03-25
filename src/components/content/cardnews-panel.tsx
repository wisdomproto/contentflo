'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardNewsCardItem, AddSlideButton, CardTextOverlay, getAspectRatioCSS, type CardTextStyle } from './cardnews-card-item';
import { CARD_TEMPLATES, TEMPLATE_CATEGORIES } from './cardnews-templates';
import { ChannelModelSelector } from './channel-model-selector';
import { ChannelContentList } from './channel-content-list';
import { PromptEditDialog } from './prompt-edit-dialog';
import { useAiGeneration } from '@/hooks/use-ai-generation';
import { useImageGeneration, type ImagePrompt } from '@/hooks/use-image-generation';
import { useCardImageGeneration } from '@/hooks/use-card-image-generation';
import { base64ToBlob } from '@/hooks/use-r2-upload';
import { useProjectStore } from '@/stores/project-store';
import { buildCardNewsImagePromptsPrompt } from '@/lib/prompt-builder';

import { Eye, Loader2, Hash, X, ImageIcon, Download, Upload, RefreshCw, ChevronDown } from 'lucide-react';
import { GenerationButton } from './generation-button';
import type { Content, Project, InstagramContent, InstagramCard, BlogCard } from '@/types/database';
import { generateId, cn } from '@/lib/utils';

// Templates imported from cardnews-templates.ts

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
    getBlogContents,
    getBlogCards,
  } = useProjectStore();

  const baseArticle = getBaseArticle(content.id);
  const cards = getInstagramCards(igContent.id);

  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [caption, setCaption] = useState(igContent.caption ?? '');
  const [slideTexts, setSlideTexts] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [hashtagInput, setHashtagInput] = useState('');
  const hashtags = igContent.hashtags ?? [];

  // 글로벌 카드 스타일
  const [globalStyle, setGlobalStyle] = useState<CardTextStyle>(() => {
    const first = (cards[0]?.text_style ?? {}) as CardTextStyle;
    return {
      color: first.color ?? '#ffffff',
      strokeWidth: first.strokeWidth ?? 0,
      strokeColor: first.strokeColor ?? '#000000',
      bgEnabled: first.bgEnabled ?? true,
      bgColor: first.bgColor ?? '#000000',
      bgBorderColor: first.bgBorderColor ?? '#ffffff',
      bgOpacity: first.bgOpacity ?? 0.3,
      bgBlur: first.bgBlur ?? 8,
      headlineBodyGap: first.headlineBodyGap ?? 4,
      headlineFontSize: first.headlineFontSize ?? 20,
      bodyFontSize: first.bodyFontSize ?? 13,
      textAlign: first.textAlign ?? 'center',
    };
  });

  const applyGlobalStyle = (updates: Partial<CardTextStyle>) => {
    // When applying a full template (has layoutType), reset conflicting properties
    const isFullTemplate = 'layoutType' in updates;
    const resets: Partial<CardTextStyle> = isFullTemplate ? {
      bgGradient: undefined,
      accentColor: undefined,
      textPosition: undefined,
      aspectRatio: undefined,
    } : {};
    const next = { ...globalStyle, ...resets, ...updates };
    setGlobalStyle(next);
    // 모든 카드에 적용
    for (const card of cards) {
      const existing = (card.text_style ?? {}) as CardTextStyle;
      updateInstagramCard(card.id, {
        text_style: { ...existing, ...resets, ...next },
      });
    }
  };

  // 슬라이드 텍스트 초기화 (기존 카드에서)
  useEffect(() => {
    if (cards.length > 0 && !slideTexts) {
      const texts = cards.map(c => c.text_content || '').join('\n\n');
      if (texts.trim()) setSlideTexts(texts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [igContent.id]);

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
            slides: { image_prompt: string; headline?: string; body?: string; text_overlay?: string }[];
          };

          const newCaption = parsed.caption || caption;
          const newHashtags = parsed.hashtags?.length ? parsed.hashtags : hashtags;
          setCaption(newCaption);
          updateInstagramContent(igContent.id, {
            caption: newCaption || null,
            hashtags: newHashtags,
          });

          const now = new Date().toISOString();
          const newCards: InstagramCard[] = parsed.slides.map((slide, i) => {
            const headline = slide.headline || '';
            const body = slide.body || slide.text_overlay || '';
            const combined = [headline, body].filter(Boolean).join('\n');
            return {
              id: generateId('ic'),
              instagram_content_id: igContent.id,
              text_content: combined || null,
              background_color: '#1a1a2e',
              background_image_url: null,
              text_style: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#ffffff', bgEnabled: true, bgOpacity: 0.3, bgBlur: 8, headline, body },
              image_prompt: slide.image_prompt || null,
              reference_image_url: null,
              sort_order: i,
              created_at: now,
              updated_at: now,
            };
          });

          setInstagramCardsForContent(igContent.id, newCards);

          // 텍스트 편집 영역에 슬라이드별 텍스트 표시 (빈줄로 구분)
          const textLines = parsed.slides.map(s => {
            const h = s.headline || '';
            const b = s.body || s.text_overlay || '';
            return [h, b].filter(Boolean).join('\n');
          }).join('\n\n');
          setSlideTexts(textLines);
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

  const { isGenerating: isGeneratingImages, progress: imageProgress, generateSingleImage, abort: abortImages } = useImageGeneration();
  const [cardnewsBatchProgress, setCardnewsBatchProgress] = useState({ current: 0, total: 0 });

  const startImageGeneration = async (imagePrompts: ImagePrompt[], currentCards: InstagramCard[], igContentId: string) => {
    const total = imagePrompts.length;
    setCardnewsBatchProgress({ current: 0, total });

    for (let i = 0; i < total; i++) {
      setCardnewsBatchProgress({ current: i, total });
      const p = imagePrompts[i];
      try {
        const result = await generateSingleImage(
          p.prompt,
          channelModels.imageModel,
          p.aspectRatio,
        );
        if (!result) continue;

        // R2 업로드
        const state = useProjectStore.getState();
        const latestCards = state.getInstagramCards(igContentId);
        const card = latestCards[p.slideIndex] ?? currentCards[p.slideIndex];
        if (!card) continue;

        let savedUrl = `data:${result.mimeType};base64,${result.base64}`;
        try {
          const blob = base64ToBlob(result.base64, result.mimeType);
          const presignRes = await fetch('/api/storage/presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: project.id,
              category: 'images',
              fileName: `${card.id}.${result.mimeType.split('/')[1] || 'png'}`,
              contentType: result.mimeType,
              contentId: card.id,
            }),
          });
          if (presignRes.ok) {
            const { presignedUrl, publicUrl } = await presignRes.json();
            const uploadRes = await fetch(presignedUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': result.mimeType } });
            if (uploadRes.ok) savedUrl = publicUrl;
          }
        } catch { /* R2 실패 시 data URL 유지 */ }

        // 화면 즉시 업데이트
        state.updateInstagramCard(card.id, { background_image_url: savedUrl });
      } catch (err) {
        const msg = (err as Error).message;
        // 503 등 일시 오류는 스킵하고 계속 진행
        if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
          console.warn(`[cardnews] Slide ${i + 1} skipped (503): ${msg}`);
          continue;
        }
        console.error(`[cardnews] Slide ${i + 1} failed:`, msg);
      }
    }
    setCardnewsBatchProgress({ current: total, total });
  };

  const isGenerating = isGeneratingPrompts || isGeneratingImages;

  const handleGenerate = () => {
    const prompt = buildCardNewsImagePromptsPrompt({ project, content, baseArticle: baseArticle ?? undefined });

    // 블로그 섹션이 있으면 프롬프트에 추가
    const blogContents = getBlogContents(content.id);
    let blogSectionsPrompt = '';
    if (blogContents.length > 0) {
      const blogCards = getBlogCards(blogContents[0].id);
      if (blogCards.length > 0) {
        const sections = blogCards.map((bc: BlogCard, i: number) => {
          const c = bc.content as { text?: string };
          const plain = (c.text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          return `섹션 ${i + 1}: ${plain}`;
        }).join('\n\n');
        blogSectionsPrompt = `\n\n## 블로그 섹션 (각 섹션을 1장의 카드뉴스로 요약)\n아래 블로그 글의 각 섹션을 카드뉴스 슬라이드 1장으로 요약하세요. 섹션 수 = 슬라이드 수.\n각 슬라이드의 text_overlay는 해당 섹션의 핵심 내용을 30자 이내로 압축.\n\n${sections}`;
      }
    }

    setGeneratedPrompt(prompt + blogSectionsPrompt);
    setShowPromptDialog(true);
  };

  const handleStartGeneration = (prompt: string) => {
    generatePrompts(prompt, channelModels.textModel);
  };

  // 블로그 글에서 카드뉴스 가져오기
  const handleImportFromBlog = () => {
    const blogContents = getBlogContents(content.id);
    if (blogContents.length === 0) { alert('블로그 글이 없습니다. 먼저 블로그 글을 생성해 주세요.'); return; }

    const blogContent = blogContents[0]; // 첫 번째 블로그 콘텐츠
    const blogCards = getBlogCards(blogContent.id);
    if (blogCards.length === 0) { alert('블로그 섹션이 없습니다.'); return; }

    // 블로그 카드 → 인스타 카드 변환
    const now = new Date().toISOString();
    const newCards: InstagramCard[] = blogCards.map((bc: BlogCard, i: number) => {
      const bcContent = bc.content as { text?: string; alt?: string; image_prompt?: string };
      // HTML 태그 제거하여 순수 텍스트 추출
      const plainText = (bcContent.text || '')
        .replace(/<h[2-6][^>]*>(.*?)<\/h[2-6]>/gi, '$1\n')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return {
        id: generateId('ic'),
        instagram_content_id: igContent.id,
        text_content: plainText || null,
        background_color: '#1a1a2e',
        background_image_url: null,
        text_style: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#ffffff', bgEnabled: true, bgOpacity: 0.3, bgBlur: 8 },
        image_prompt: bcContent.image_prompt || null,
        reference_image_url: null,
        sort_order: i,
        created_at: now,
        updated_at: now,
      };
    });

    setInstagramCardsForContent(igContent.id, newCards);
    setSlideTexts(newCards.map(c => c.text_content || '').join('\n\n'));
  };

  // 텍스트 편집 → 카드에 반영
  const handleApplyTexts = () => {
    const texts = slideTexts.split(/\n\n+/).map(t => t.trim()).filter(Boolean);
    const state = useProjectStore.getState();
    const currentCards = state.getInstagramCards(igContent.id);
    for (let i = 0; i < currentCards.length && i < texts.length; i++) {
      updateInstagramCard(currentCards[i].id, { text_content: texts[i] });
    }
    // 카드보다 텍스트가 많으면 새 카드 추가
    for (let i = currentCards.length; i < texts.length; i++) {
      addInstagramCard(igContent.id, i);
      const updated = useProjectStore.getState().getInstagramCards(igContent.id);
      const newCard = updated[i];
      if (newCard) updateInstagramCard(newCard.id, { text_content: texts[i] });
    }
  };

  // 이미지 일괄 생성 (텍스트 반영 후)
  const handleGenerateAllImages = async () => {
    handleApplyTexts();
    const state = useProjectStore.getState();
    const currentCards = state.getInstagramCards(igContent.id);
    if (currentCards.length === 0) return;

    const prompts: ImagePrompt[] = currentCards.map((card, i) => ({
      slideIndex: i,
      prompt: card.image_prompt || `Create an illustration for social media card: "${card.text_content || 'Slide'}". ${imageStyle}`,
      referenceImage: referenceImage || undefined,
      aspectRatio: (channelModels.aspectRatio || '1:1') as import('@/lib/ai/types').AspectRatio,
    }));
    await startImageGeneration(prompts, currentCards, igContent.id);
  };

  const handleAbort = () => {
    abortPrompts();
    abortImages();
  };

  // 개별 카드 이미지 생성 (공통 훅)
  const { isGeneratingImage: isRegeneratingCard, generatingCardId, generateCardImage: generateSingleCardImage } = useCardImageGeneration({
    getPrompt: (card: InstagramCard) => {
      if (card.image_prompt) return imageStyle ? `${imageStyle}. ${card.image_prompt}` : card.image_prompt;
      return `Create an illustration for social media card: "${card.text_content || 'Slide'}". ${imageStyle}`;
    },
    getExistingImage: (card: InstagramCard) => card.background_image_url || null,
    saveResult: (cardId: string, dataUrl: string, prompt: string) => {
      updateInstagramCard(cardId, { background_image_url: dataUrl, image_prompt: prompt });
    },
    imageModel: channelModels.imageModel,
    aspectRatio: channelModels.aspectRatio || '4:3',
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

  // Template section collapse state
  const [isTemplateOpen, setIsTemplateOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('solid');

  return (
    <div className="space-y-4">
      {/* Template presets — collapsible, at the top */}
      <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
        <button
          onClick={() => setIsTemplateOpen(!isTemplateOpen)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
        >
          <h3 className="text-xs font-semibold">템플릿</h3>
          <ChevronDown size={14} className={cn('text-muted-foreground transition-transform', isTemplateOpen && 'rotate-180')} />
        </button>
        {isTemplateOpen && (
          <div className="px-3 pb-3 space-y-3">
            {/* Category tabs */}
            <div className="flex gap-1">
              {TEMPLATE_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    'px-2 py-1 rounded text-[10px] font-medium transition-colors',
                    activeCategory === cat.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
            {/* Template grid with rich previews */}
            <div className="grid grid-cols-4 gap-2">
              {CARD_TEMPLATES.filter(t => t.category === activeCategory).map(t => {
                const s = t.style;
                const bg = s.bgGradient || s.bgColor || '#1a1a2e';
                const txtColor = s.color || '#ffffff';
                const accent = s.accentColor;
                const layout = s.layoutType || 'standard';
                const align = (s.textAlign as 'left' | 'center' | 'right') || 'center';

                {/* Mini landscape SVG for image areas */}
                const sampleImageSvg = (
                  <svg viewBox="0 0 80 60" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                    <defs>
                      <linearGradient id={`sky-${t.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#87CEEB" />
                        <stop offset="100%" stopColor="#E0F0FF" />
                      </linearGradient>
                    </defs>
                    <rect width="80" height="60" fill={`url(#sky-${t.id})`} />
                    <circle cx="62" cy="14" r="8" fill="#FFD93D" opacity="0.9" />
                    <ellipse cx="20" cy="12" rx="14" ry="5" fill="white" opacity="0.6" />
                    <ellipse cx="55" cy="10" rx="10" ry="3.5" fill="white" opacity="0.4" />
                    <path d="M0 60 L0 35 Q20 20 35 32 Q45 25 55 30 Q65 22 80 28 L80 60 Z" fill="#4A8C5C" />
                    <path d="M0 60 L0 42 Q15 35 30 40 Q50 32 65 38 Q75 35 80 37 L80 60 Z" fill="#3A7C4C" />
                    <path d="M0 60 L0 48 Q25 42 40 47 Q55 43 70 46 L80 45 L80 60 Z" fill="#2D6A3F" />
                  </svg>
                );

                const sampleCitySvg = (
                  <svg viewBox="0 0 80 60" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
                    <rect width="80" height="60" fill="#1a1a2e" />
                    <rect x="5" y="25" width="8" height="35" rx="1" fill="#2a2a4e" />
                    <rect x="15" y="15" width="10" height="45" rx="1" fill="#333366" />
                    <rect x="27" y="20" width="7" height="40" rx="1" fill="#2a2a4e" />
                    <rect x="36" y="10" width="12" height="50" rx="1" fill="#3a3a6e" />
                    <rect x="50" y="22" width="9" height="38" rx="1" fill="#2a2a4e" />
                    <rect x="61" y="18" width="8" height="42" rx="1" fill="#333366" />
                    <rect x="71" y="28" width="7" height="32" rx="1" fill="#2a2a4e" />
                    {[8,18,20,30,39,42,45,53,57,64,67,74].map((x,i) => (
                      <rect key={i} x={x} y={15 + (i % 5) * 8} width="2" height="2" fill="#FFD93D" opacity="0.6" />
                    ))}
                    <circle cx="65" cy="8" r="4" fill="#FFD93D" opacity="0.15" />
                  </svg>
                );

                const imgArea = layout === 'photo-bg' ? sampleCitySvg : (t.id.includes('dark') || t.id.includes('black') || t.id.includes('neon') ? sampleCitySvg : sampleImageSvg);

                return (
                  <button
                    key={t.id}
                    onClick={() => applyGlobalStyle(t.style)}
                    className="rounded-lg border border-border overflow-hidden hover:ring-2 hover:ring-primary transition-all group"
                    title={t.name}
                  >
                    <div
                      className="relative overflow-hidden"
                      style={{ aspectRatio: '4/5' }}
                    >
                      {/* Background */}
                      <div className="absolute inset-0" style={{ background: bg }} />

                      {/* Layout-specific mini preview with sample text & image */}
                      {layout === 'standard' && (
                        <div className="absolute inset-0 flex flex-col">
                          <div className="flex-[4] flex flex-col justify-center px-2 py-1" style={{ textAlign: align }}>
                            {accent && <div className="h-[2px] rounded mb-1" style={{ backgroundColor: accent, width: '30%', marginLeft: align === 'center' ? 'auto' : undefined, marginRight: align === 'center' ? 'auto' : undefined }} />}
                            <p className="leading-tight font-bold" style={{ fontSize: '6px', color: txtColor }}>SNS 마케팅</p>
                            <p className="leading-tight mt-0.5" style={{ fontSize: '4px', color: txtColor, opacity: 0.6 }}>브랜드 성장 전략</p>
                          </div>
                          <div className="flex-[6] mx-1 mb-1 rounded-sm overflow-hidden">
                            {imgArea}
                          </div>
                        </div>
                      )}

                      {layout === 'text-only' && (
                        <div className="absolute inset-0 flex flex-col justify-center px-2 gap-0.5" style={{ textAlign: align }}>
                          {accent && <div className="h-[2px] rounded" style={{ backgroundColor: accent, width: '25%', marginLeft: align === 'center' ? 'auto' : undefined, marginRight: align === 'center' ? 'auto' : undefined }} />}
                          <p className="leading-tight font-bold" style={{ fontSize: '7px', color: txtColor }}>콘텐츠의 힘</p>
                          <p className="leading-snug mt-0.5" style={{ fontSize: '4px', color: txtColor, opacity: 0.6 }}>좋은 콘텐츠는 고객의<br/>마음을 움직입니다</p>
                        </div>
                      )}

                      {layout === 'photo-bg' && (
                        <div className="absolute inset-0">
                          <div className="absolute inset-0">{imgArea}</div>
                          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/70" />
                          <div className="absolute bottom-0 left-0 right-0 p-1.5" style={{ textAlign: s.textPosition === 'center' ? 'center' : 'left' }}>
                            <p className="leading-tight font-bold" style={{ fontSize: '6px', color: '#ffffff' }}>감성 브랜딩</p>
                            <p className="leading-tight mt-0.5" style={{ fontSize: '3.5px', color: '#ffffff', opacity: 0.7 }}>사진으로 전하는 이야기</p>
                          </div>
                        </div>
                      )}

                      {layout === 'split-top' && (
                        <div className="absolute inset-0 flex flex-col">
                          <div className="flex-1 overflow-hidden">
                            {imgArea}
                          </div>
                          <div className="flex-1 flex flex-col justify-center px-1.5 gap-0.5" style={{ background: bg, textAlign: align }}>
                            {accent && <div className="h-[1.5px] rounded" style={{ backgroundColor: accent, width: '25%' }} />}
                            <p className="leading-tight font-bold" style={{ fontSize: '5px', color: txtColor }}>매거진 스타일</p>
                            <p className="leading-tight" style={{ fontSize: '3.5px', color: txtColor, opacity: 0.6 }}>이미지와 텍스트의 조화</p>
                          </div>
                        </div>
                      )}

                      {layout === 'split-left' && (
                        <div className="absolute inset-0 flex flex-row">
                          <div className="flex-1 flex flex-col justify-center px-1 gap-0.5" style={{ background: bg, textAlign: align }}>
                            {accent && <div className="h-[1.5px] rounded" style={{ backgroundColor: accent, width: '30%' }} />}
                            <p className="leading-tight font-bold" style={{ fontSize: '4.5px', color: txtColor }}>랜드스케이프</p>
                            <p className="leading-tight" style={{ fontSize: '3px', color: txtColor, opacity: 0.6 }}>넓은 시야의 구성</p>
                          </div>
                          <div className="flex-1 overflow-hidden">
                            {imgArea}
                          </div>
                        </div>
                      )}

                      {/* Aspect ratio badge */}
                      {s.aspectRatio && s.aspectRatio !== '4:5' && (
                        <span className="absolute top-0.5 right-0.5 text-[5px] font-mono px-0.5 rounded bg-black/50 text-white/80">
                          {s.aspectRatio}
                        </span>
                      )}
                    </div>
                    <p className="text-[8px] text-center py-1 bg-muted/50 truncate px-1 font-medium">{t.name}</p>
                  </button>
                );
              })}
            </div>

            {/* Inline style adjustments */}
            <h3 className="text-xs font-semibold pt-1">스타일 조정</h3>
            {/* Row 1: font color + bg color */}
            <div className="flex gap-4 text-[10px]">
              <div className="space-y-1 flex-1">
                <span className="text-muted-foreground">글자색</span>
                <div className="flex gap-1 items-center flex-wrap">
                  {['#ffffff', '#000000', '#f8f8f8', '#333333', '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8'].map(c => (
                    <button key={c} onClick={() => applyGlobalStyle({ color: c })}
                      className="w-5 h-5 rounded-full border transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: globalStyle.color === c ? 'hsl(var(--primary))' : c === '#ffffff' ? '#ccc' : 'transparent', boxShadow: globalStyle.color === c ? '0 0 0 2px hsl(var(--primary))' : undefined }}
                    />
                  ))}
                  <label className="relative cursor-pointer">
                    <div className="w-5 h-5 rounded-full border border-border bg-gradient-to-br from-red-500 via-green-500 to-blue-500 hover:scale-110 transition-transform" />
                    <input type="color" value={globalStyle.color ?? '#ffffff'} onChange={e => applyGlobalStyle({ color: e.target.value })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </label>
                </div>
              </div>
              <div className="space-y-1 flex-1">
                <span className="text-muted-foreground">배경색</span>
                <div className="flex gap-1 items-center flex-wrap">
                  {['#000000', '#1a1a2e', '#0f3460', '#ffffff', '#2d6a4f', '#533483', '#264653', '#e76f51'].map(c => (
                    <button key={c} onClick={() => applyGlobalStyle({ bgColor: c })}
                      className="w-5 h-5 rounded-full border transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: (globalStyle.bgColor ?? '#000000') === c ? 'hsl(var(--primary))' : c === '#000000' ? '#555' : 'transparent', boxShadow: (globalStyle.bgColor ?? '#000000') === c ? '0 0 0 2px hsl(var(--primary))' : undefined }}
                    />
                  ))}
                  <label className="relative cursor-pointer">
                    <div className="w-5 h-5 rounded-full border border-border bg-gradient-to-br from-red-500 via-green-500 to-blue-500 hover:scale-110 transition-transform" />
                    <input type="color" value={globalStyle.bgColor ?? '#000000'} onChange={e => applyGlobalStyle({ bgColor: e.target.value })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  </label>
                </div>
              </div>
            </div>
            {/* Row 2: toggles + sliders */}
            <div className="flex items-center gap-3 text-[10px] flex-wrap">
              <button
                onClick={() => applyGlobalStyle({ strokeWidth: globalStyle.strokeWidth ? 0 : 1 })}
                className={`px-2 py-0.5 rounded border border-border ${globalStyle.strokeWidth ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                글자 테두리
              </button>
              <div className="flex items-center gap-1 flex-1 min-w-[100px]">
                <span className="text-muted-foreground whitespace-nowrap">간격</span>
                <input type="range" min={0} max={30} step={2} value={globalStyle.headlineBodyGap ?? 4}
                  onChange={e => applyGlobalStyle({ headlineBodyGap: Number(e.target.value) })}
                  className="flex-1 h-1 accent-primary" />
                <span className="w-5 text-right">{globalStyle.headlineBodyGap ?? 4}</span>
              </div>
            </div>
            {/* Row 3: font sizes + alignment */}
            <div className="flex items-center gap-3 text-[10px] flex-wrap">
              <label className="flex items-center gap-1">
                <span className="text-muted-foreground whitespace-nowrap">헤더</span>
                <input type="number" min={10} max={60} value={globalStyle.headlineFontSize ?? 20}
                  onChange={e => applyGlobalStyle({ headlineFontSize: Number(e.target.value) })}
                  className="w-12 px-1 py-0.5 rounded border border-border bg-transparent text-center" />
                <span className="text-muted-foreground">px</span>
              </label>
              <label className="flex items-center gap-1">
                <span className="text-muted-foreground whitespace-nowrap">본문</span>
                <input type="number" min={8} max={40} value={globalStyle.bodyFontSize ?? 13}
                  onChange={e => applyGlobalStyle({ bodyFontSize: Number(e.target.value) })}
                  className="w-12 px-1 py-0.5 rounded border border-border bg-transparent text-center" />
                <span className="text-muted-foreground">px</span>
              </label>
              <div className="flex gap-0.5 ml-2">
                {(['left', 'center', 'right'] as const).map(align => (
                  <button
                    key={align}
                    onClick={() => applyGlobalStyle({ textAlign: align })}
                    className={`px-2 py-0.5 rounded border border-border ${(globalStyle.textAlign ?? 'center') === align ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  >
                    {align === 'left' ? '←' : align === 'center' ? '↔' : '→'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {cards.length > 0 && <Badge variant="secondary" className="text-xs">{cards.length}장</Badge>}
        </div>
        <div className="flex gap-2">
          <GenerationButton
            variant="text"
            isGenerating={isGeneratingPrompts}
            disabled={!hasBaseArticle || isGeneratingImages}
            onClick={handleGenerate}
            onAbort={abortPrompts}
            label="AI 텍스트"
            loadingLabel="텍스트 생성 중..."
            className={!isGeneratingPrompts ? 'bg-pink-600 hover:bg-pink-700 text-white' : undefined}
          />
          <GenerationButton
            variant="batch-image"
            isGenerating={isGeneratingImages}
            disabled={cards.length === 0 || isGeneratingPrompts}
            onClick={handleGenerateAllImages}
            onAbort={abortImages}
            progress={cardnewsBatchProgress}
          />
          {cards.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => { setPreviewIndex(0); setShowPreview(true); }} className="gap-1.5">
              <Eye size={14} /> 미리보기
            </Button>
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

      {/* Slide text editor */}
      {cards.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold">슬라이드 텍스트 (빈줄로 구분)</h3>
            <div className="flex gap-1">
              <Button
                variant="outline" size="sm"
                onClick={handleGenerate}
                disabled={isGenerating || !hasBaseArticle}
                className="text-xs h-6 gap-1"
              >
                <RefreshCw size={10} /> 재생성
              </Button>
              <Button variant="outline" size="sm" onClick={handleApplyTexts} className="text-xs h-6">
                텍스트 적용
              </Button>
            </div>
          </div>
          <textarea
            value={slideTexts}
            onChange={(e) => setSlideTexts(e.target.value)}
            placeholder={"첫 번째 슬라이드 텍스트\n\n두 번째 슬라이드 텍스트\n\n세 번째 슬라이드 텍스트"}
            className="w-full text-sm border border-border rounded-md px-3 py-2 focus:outline-none focus:border-primary bg-transparent resize-none font-mono"
            rows={Math.max(6, slideTexts.split('\n').length + 1)}
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">
              {slideTexts.split(/\n\n+/).filter(t => t.trim()).length}개 슬라이드
            </p>
            <GenerationButton
              variant="batch-image"
              isGenerating={isGeneratingImages}
              disabled={cards.length === 0 || isGeneratingPrompts}
              onClick={handleGenerateAllImages}
              onAbort={abortImages}
              progress={cardnewsBatchProgress}
              label="이미지 생성"
            />
          </div>
        </div>
      )}

      {/* Slide Grid — 2 columns */}
      {cards.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {cards.map((card) => (
            <CardNewsCardItem
              key={card.id}
              card={card}
              index={card.sort_order}
              onUpdate={handleCardUpdate}
              onDelete={handleCardDelete}
              onRegenerateImage={card.background_image_url ? () => handleGenerateCardImage(card.id) : undefined}
              onGenerateImage={() => handleGenerateCardImage(card.id)}
              isRegeneratingThis={generatingCardId === card.id}
              isAnyRegenerating={isRegeneratingCard || isGeneratingImages}
            />
          ))}
          <AddSlideButton onAdd={handleAddSlide} />
        </div>
      )}

      {cards.length === 0 && hasBaseArticle && (
        <div className="grid grid-cols-2 gap-4">
          <AddSlideButton onAdd={handleAddSlide} />
        </div>
      )}

      {/* Full-screen preview modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative max-w-[90vmin] max-h-[90vh] flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost" size="sm"
                onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                disabled={previewIndex === 0}
                className="text-white hover:bg-white/20"
              >
                ◀
              </Button>
              <span className="text-white text-sm">{previewIndex + 1} / {cards.length}</span>
              <Button
                variant="ghost" size="sm"
                onClick={() => setPreviewIndex(Math.min(cards.length - 1, previewIndex + 1))}
                disabled={previewIndex >= cards.length - 1}
                className="text-white hover:bg-white/20"
              >
                ▶
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)} className="text-white hover:bg-white/20 ml-4">
                ✕ 닫기
              </Button>
            </div>
            {cards[previewIndex] && (() => {
              const ps = (cards[previewIndex].text_style ?? {}) as CardTextStyle;
              const pLayout = ps.layoutType || 'standard';
              const pBg = ps.bgGradient
                ? { background: ps.bgGradient }
                : { backgroundColor: ps.bgColor || cards[previewIndex].background_color || '#1a1a2e' };
              const pAr = getAspectRatioCSS(ps.aspectRatio || '4/5');
              const hasImg = !!cards[previewIndex].background_image_url;

              if (pLayout === 'text-only') {
                return (
                  <div className="relative rounded-lg overflow-hidden" style={{ width: '64vmin', aspectRatio: pAr, ...pBg }}>
                    {ps.accentColor && <div className="absolute top-6 left-6 w-12 h-1.5 rounded z-10" style={{ backgroundColor: ps.accentColor }} />}
                    <div className={cn('absolute inset-0 flex p-10', ps.textPosition === 'center' ? 'items-center justify-center' : 'items-end pb-16')}>
                      <CardTextOverlay style={ps} hasImage={false} scale={3} />
                    </div>
                  </div>
                );
              }

              if (pLayout === 'photo-bg') {
                return (
                  <div className="relative rounded-lg overflow-hidden" style={{ width: '64vmin', aspectRatio: pAr, ...pBg }}>
                    {hasImg && <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cards[previewIndex].background_image_url!} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70" />
                    </>}
                    <div className={cn('absolute inset-x-0 p-8 z-10', ps.textPosition === 'center' ? 'inset-0 flex items-center justify-center' : 'bottom-0')}>
                      <CardTextOverlay style={{ ...ps, color: ps.color || '#ffffff' }} hasImage={true} scale={3} />
                    </div>
                  </div>
                );
              }

              if (pLayout === 'split-top') {
                return (
                  <div className="relative rounded-lg overflow-hidden" style={{ width: '64vmin', aspectRatio: pAr, ...pBg }}>
                    <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: '50%' }}>
                      {hasImg ? <img src={cards[previewIndex].background_image_url!} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/5" />}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex items-center p-8" style={{ height: '50%' }}>
                      <CardTextOverlay style={ps} hasImage={false} scale={3} />
                    </div>
                  </div>
                );
              }

              if (pLayout === 'split-left') {
                return (
                  <div className="relative rounded-lg overflow-hidden flex" style={{ width: '64vmin', aspectRatio: pAr, ...pBg }}>
                    <div className="w-1/2 flex items-center p-6">
                      <CardTextOverlay style={ps} hasImage={false} scale={3} />
                    </div>
                    <div className="w-1/2 overflow-hidden">
                      {hasImg ? <img src={cards[previewIndex].background_image_url!} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/5" />}
                    </div>
                  </div>
                );
              }

              // Standard
              return (
                <div className="relative rounded-lg overflow-hidden" style={{ width: '64vmin', aspectRatio: pAr, ...pBg }}>
                  <div className="absolute inset-x-0 top-0 flex items-center justify-center p-6" style={{ height: '40%' }}>
                    {(ps.headline || ps.body || cards[previewIndex].text_content) && (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <CardTextOverlay style={ps} hasImage={false} scale={3} />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 overflow-hidden" style={{ height: '60%' }}>
                    {hasImg ? <img src={cards[previewIndex].background_image_url!} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/5" />}
                  </div>
                </div>
              );
            })()}
          </div>
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
