'use client';

import { useState, useCallback, useRef } from 'react';
import { useImageGeneration, type ImageGenerationProgress } from './use-image-generation';
import type { AspectRatio } from '@/lib/ai/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CardImageConfig {
  /** 카드에서 이미지 프롬프트를 추출/생성하는 함수 */
  getPrompt: (card: any) => string;
  /** 카드에서 기존 이미지 URL을 추출 (재생성 시 referenceImage로 전달) */
  getExistingImage: (card: any) => string | null;
  /** 생성 결과를 저장하는 함수 */
  saveResult: (cardId: string, dataUrl: string, prompt: string) => void;
  /** 배치 생성 시 스킵 조건 (기존 이미지가 있으면 true) */
  shouldSkip?: (card: any) => boolean;
  /** 이미지 모델 ID */
  imageModel: string;
  /** 이미지 비율 (예: '16:9', '1:1') */
  aspectRatio: string;
  /** 이미지 스타일 (예: 'realistic') */
  imageStyle: string;
  /** 패널 레벨 참조 이미지 (카드뉴스 등) */
  referenceImage?: string;
}

export interface UseCardImageGenerationReturn {
  isGeneratingImage: boolean;
  generatingCardId: string | null;
  imageProgress: ImageGenerationProgress;
  generateCardImage: (cardId: string, cards: any[]) => Promise<void>;
  generateAllImages: (cards: any[]) => Promise<void>;
  abort: () => void;
}

export function useCardImageGeneration(config: CardImageConfig): UseCardImageGenerationReturn {
  const { isGenerating: isGeneratingImage, progress: imageProgress, generateImages, abort: abortGeneration } = useImageGeneration();
  const [generatingCardId, setGeneratingCardId] = useState<string | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  const generateCardImage = useCallback(
    async (cardId: string, cards: any[]) => {
      const cfg = configRef.current;
      const card = cards.find((c: any) => c.id === cardId);
      if (!card) return;

      const prompt = cfg.getPrompt(card);

      // 재생성 시 이전 이미지를 참조 이미지로 전달
      const existingImage = cfg.getExistingImage(card);
      // 패널 레벨 참조 이미지가 있으면 우선, 없으면 기존 이미지 사용
      const refImage = cfg.referenceImage || existingImage || undefined;

      setGeneratingCardId(cardId);
      try {
        const results = await generateImages(
          [{
            slideIndex: 0,
            prompt,
            aspectRatio: cfg.aspectRatio as AspectRatio,
            referenceImage: refImage,
          }],
          cfg.imageModel
        );
        if (results[0]) {
          const dataUrl = `data:${results[0].mimeType};base64,${results[0].base64}`;
          cfg.saveResult(cardId, dataUrl, prompt);
        }
      } catch (err) {
        alert(`이미지 생성 오류: ${(err as Error).message}`);
      } finally {
        setGeneratingCardId(null);
      }
    },
    [generateImages]
  );

  const generateAllImages = useCallback(
    async (cards: any[]) => {
      if (cards.length === 0) return;
      const cfg = configRef.current;
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        if (cfg.shouldSkip?.(card)) continue;
        await generateCardImage(card.id, cards);
      }
    },
    [generateCardImage]
  );

  const abort = useCallback(() => {
    abortGeneration();
    setGeneratingCardId(null);
  }, [abortGeneration]);

  return {
    isGeneratingImage,
    generatingCardId,
    imageProgress,
    generateCardImage,
    generateAllImages,
    abort,
  };
}
