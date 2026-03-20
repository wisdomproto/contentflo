import { GoogleGenAI } from '@google/genai';
import type { ImageGenerator, ImageGenerationRequest, ImageGenerationResult } from './types';

/**
 * Gemini 네이티브 이미지 생성 (gemini-*-image-* 모델)
 * responseModalities: ['IMAGE'] 로 이미지 직접 생성
 */
class GeminiImageGenerator implements ImageGenerator {
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    // 참조 이미지가 있으면 multimodal input으로 전달
    let contents: string | Array<{ inlineData?: { mimeType: string; data: string }; text?: string }>;
    if (request.referenceImage) {
      // data:image/png;base64,... 형식에서 mimeType과 data 추출
      const match = request.referenceImage.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (match) {
        contents = [
          { inlineData: { mimeType: match[1], data: match[2] } },
          { text: `Use the visual style, frame, and composition of this reference image as a guide. Generate a new image with this prompt: ${request.prompt}` },
        ];
      } else {
        contents = request.prompt;
      }
    } else {
      contents = request.prompt;
    }

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents,
      config: {
        responseModalities: ['IMAGE'],
        ...(request.aspectRatio || request.imageSize
          ? {
              imageConfig: {
                ...(request.aspectRatio && { aspectRatio: request.aspectRatio }),
                ...(request.imageSize && { imageSize: request.imageSize }),
              },
            }
          : {}),
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new Error('이미지 생성 응답에 데이터가 없습니다.');
    }

    for (const part of parts) {
      if (part.inlineData) {
        return {
          base64: part.inlineData.data!,
          mimeType: part.inlineData.mimeType || 'image/png',
        };
      }
    }

    throw new Error('응답에서 이미지 데이터를 찾을 수 없습니다.');
  }
}

/**
 * Imagen 전용 이미지 생성 (imagen-4.0-generate-001 등)
 * generateImages API 사용
 */
class ImagenGenerator implements ImageGenerator {
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const response = await this.ai.models.generateImages({
      model: this.model,
      prompt: request.prompt,
      config: {
        numberOfImages: 1,
        ...(request.aspectRatio && { aspectRatio: request.aspectRatio }),
      },
    });

    const image = response.generatedImages?.[0];
    if (!image?.image?.imageBytes) {
      throw new Error('Imagen 응답에서 이미지 데이터를 찾을 수 없습니다.');
    }

    return {
      base64: image.image.imageBytes,
      mimeType: 'image/png',
    };
  }
}

/**
 * 팩토리 함수: 모델명에 따라 적절한 ImageGenerator 구현체 반환
 * - imagen-* → ImagenGenerator
 * - 나머지 (gemini-*) → GeminiImageGenerator
 */
export function createImageGenerator(model: string, apiKey: string): ImageGenerator {
  if (model.startsWith('imagen')) {
    return new ImagenGenerator(apiKey, model);
  }
  return new GeminiImageGenerator(apiKey, model);
}
