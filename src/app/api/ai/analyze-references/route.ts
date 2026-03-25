import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

interface FileInfo {
  name: string;
  content?: string;  // 이미 추출된 텍스트
  url?: string;      // R2 public URL (서버에서 fetch)
}

const TEXT_EXTS = ['.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.html'];

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
  }

  try {
    const { files, brandName, industry } = await request.json() as {
      files: FileInfo[];
      brandName?: string;
      industry?: string;
    };

    if (!files?.length) {
      return NextResponse.json({ error: '분석할 파일이 없습니다.' }, { status: 400 });
    }

    // 텍스트 수집: content가 있으면 사용, 없으면 URL에서 서버사이드 fetch
    const texts: { name: string; content: string }[] = [];

    for (const f of files) {
      if (f.content) {
        texts.push({ name: f.name, content: f.content });
      } else if (f.url) {
        const isText = TEXT_EXTS.some(ext => f.name.toLowerCase().endsWith(ext));
        if (isText) {
          try {
            const res = await fetch(f.url);
            if (res.ok) {
              const text = await res.text();
              if (text.length > 0) {
                texts.push({ name: f.name, content: text });
              }
            }
          } catch { /* skip */ }
        }
      }
    }

    if (texts.length === 0) {
      return NextResponse.json({
        error: '분석할 텍스트를 찾을 수 없습니다. txt, md 등 텍스트 파일을 업로드하세요.',
      }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const refContent = texts.map(t => `\n### 📄 ${t.name}\n${t.content}`).join('\n\n---\n\n');

    const prompt = `당신은 마케팅 콘텐츠 전략가입니다. 아래 참고 자료들을 분석하여 콘텐츠 제작에 활용할 수 있는 구조화된 요약을 작성하세요.

${brandName ? `브랜드: ${brandName}` : ''}
${industry ? `업종: ${industry}` : ''}

## 참고 자료 원문
${refContent}

## 요약 작성 가이드

아래 형식으로 요약하세요:

### 📚 자료 개요
- 자료별 한 줄 요약 (자료명: 핵심 내용)

### 🎯 핵심 메시지 (콘텐츠에 반복 활용)
- 전문성을 보여주는 핵심 주장/데이터 5~10개
- 각각 한 줄로, 구체적 수치나 팩트 포함

### 📂 주제별 핵심 내용
자료에서 추출한 주제별로 그룹핑하여 정리:
- 각 주제: 핵심 포인트 3~5개 (구체적 수치, 사례, 인용구 포함)
- 콘텐츠 제작 시 바로 활용할 수 있는 형태로

### 💡 콘텐츠 앵글 추천
- 자료 내용 기반으로 만들 수 있는 콘텐츠 앵글 5~10개
- 각각: 주제 + 왜 효과적인지 한 줄

### ⚠️ 주의사항
- 의료/법률 등 민감한 표현이 있다면 주의할 점

모든 내용은 한국어로 작성하세요. 원문의 핵심을 놓치지 마세요.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: prompt,
      config: { maxOutputTokens: 8192 },
    });

    const summary = response.text ?? '';

    return NextResponse.json({ summary, analyzedFiles: texts.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : '분석 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
