'use client';

import { useRef, useState, useCallback } from 'react';
import type { AspectRatio, ImageSize } from '@/lib/ai/types';

export interface ImagePrompt {
  slideIndex: number;
  prompt: string;
  referenceImage?: string; // base64 data URL
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
}

export interface GeneratedImage {
  slideIndex: number;
  base64: string;
  mimeType: string;
}

export interface ImageGenerationProgress {
  current: number;
  total: number;
}

export function useImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ImageGenerationProgress>({ current: 0, total: 0 });
  const abortRef = useRef<AbortController | null>(null);

  const generateImages = useCallback(
    async (prompts: ImagePrompt[], model?: string): Promise<GeneratedImage[]> => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsGenerating(true);
      setProgress({ current: 0, total: prompts.length });

      const results: GeneratedImage[] = [];

      try {
        for (let i = 0; i < prompts.length; i++) {
          if (controller.signal.aborted) break;

          setProgress({ current: i + 1, total: prompts.length });

          const res = await fetch('/api/ai/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: prompts[i].prompt,
              ...(model && { model }),
              ...(prompts[i].referenceImage && { referenceImage: prompts[i].referenceImage }),
              ...(prompts[i].aspectRatio && { aspectRatio: prompts[i].aspectRatio }),
              ...(prompts[i].imageSize && { imageSize: prompts[i].imageSize }),
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || `이미지 생성 실패 (HTTP ${res.status})`);
          }

          const data = await res.json();
          results.push({
            slideIndex: prompts[i].slideIndex,
            base64: data.image,
            mimeType: data.mimeType,
          });
        }

        return results;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return results; // 중단 시 지금까지 생성된 결과 반환
        }
        throw err;
      } finally {
        setIsGenerating(false);
        setProgress({ current: 0, total: 0 });
      }
    },
    []
  );

  const generateSingleImage = useCallback(
    async (prompt: string, model?: string, aspectRatio?: AspectRatio): Promise<GeneratedImage> => {
      const results = await generateImages(
        [{ slideIndex: 0, prompt, aspectRatio }],
        model
      );
      return results[0];
    },
    [generateImages]
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsGenerating(false);
    setProgress({ current: 0, total: 0 });
  }, []);

  return { isGenerating, progress, generateImages, generateSingleImage, abort };
}
