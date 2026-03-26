import type { CardTextStyle } from './cardnews-card-item';

export interface CardTemplate {
  id: string;
  name: string;
  category: 'solid' | 'gradient' | 'photo' | 'layout';
  style: Partial<CardTextStyle>;
  preview: { bg: string; text: string; accent?: string; thumbnail?: string };
}

export const CARD_TEMPLATES: CardTemplate[] = [
  // ─── Solid Background (텍스트 중심, 단색 배경) ───
  {
    id: 'minimal-accent', name: '미니멀 악센트', category: 'solid',
    style: { layoutType: 'text-only', bgColor: '#ffffff', color: '#1a1a1a', strokeWidth: 0, headlineFontSize: 36, bodyFontSize: 14, textAlign: 'left', headlineBodyGap: 16, accentColor: '#FF6B35', aspectRatio: '1:1' },
    preview: { bg: '#ffffff', text: '#1a1a1a', accent: '#FF6B35', thumbnail: '/templates/eANJ2.webp' },
  },
  {
    id: 'clean-content', name: '클린 콘텐츠', category: 'solid',
    style: { layoutType: 'text-only', bgColor: '#fafafa', color: '#18181b', strokeWidth: 0, headlineFontSize: 32, bodyFontSize: 14, textAlign: 'left', headlineBodyGap: 20, accentColor: '#8B5CF6', aspectRatio: '1:1' },
    preview: { bg: '#fafafa', text: '#18181b', accent: '#8B5CF6', thumbnail: '/templates/75f38.webp' },
  },
  {
    id: 'dark-modern', name: '다크 모던', category: 'solid',
    style: { layoutType: 'text-only', bgColor: '#18181b', color: '#ffffff', strokeWidth: 0, headlineFontSize: 48, bodyFontSize: 14, textAlign: 'left', headlineBodyGap: 16, accentColor: '#14B8A6', aspectRatio: '1:1' },
    preview: { bg: '#18181b', text: '#ffffff', accent: '#14B8A6', thumbnail: '/templates/soupF.webp' },
  },
  {
    id: 'cta-light', name: 'CTA 라이트', category: 'solid',
    style: { layoutType: 'text-only', bgColor: '#fafafa', color: '#18181b', strokeWidth: 0, headlineFontSize: 36, bodyFontSize: 14, textAlign: 'center', headlineBodyGap: 16, accentColor: '#8B5CF6', aspectRatio: '1:1', textPosition: 'center' },
    preview: { bg: '#fafafa', text: '#18181b', accent: '#8B5CF6', thumbnail: '/templates/tUZMv.webp' },
  },
  {
    id: 'numbered-steps', name: '넘버드 스텝', category: 'solid',
    style: { layoutType: 'text-only', bgColor: '#fafaf8', color: '#1a1a1a', strokeWidth: 0, headlineFontSize: 28, bodyFontSize: 15, textAlign: 'left', headlineBodyGap: 14, accentColor: '#8B5CF6', aspectRatio: '4:5' },
    preview: { bg: '#fafaf8', text: '#1a1a1a', accent: '#8B5CF6', thumbnail: '/templates/UYE3a.webp' },
  },
  {
    id: 'bento-grid', name: '벤토 그리드', category: 'solid',
    style: { layoutType: 'text-only', bgColor: '#f5f5f0', color: '#1a1a1a', strokeWidth: 0, headlineFontSize: 16, bodyFontSize: 11, textAlign: 'left', headlineBodyGap: 12, accentColor: '#FF6B35', aspectRatio: '1:1' },
    preview: { bg: '#f5f5f0', text: '#1a1a1a', accent: '#FF6B35', thumbnail: '/templates/SuFbE.webp' },
  },
  // ─── Gradient Background (그라데이션 배경) ───
  {
    id: 'purple-cover', name: '퍼플 커버', category: 'gradient',
    style: { layoutType: 'text-only', bgGradient: 'linear-gradient(160deg, #7C3AED 0%, #8B5CF6 40%, #A78BFA 100%)', bgColor: '#7C3AED', color: '#ffffff', strokeWidth: 0, headlineFontSize: 48, bodyFontSize: 16, textAlign: 'left', headlineBodyGap: 24, accentColor: '#F472B6', aspectRatio: '1:1' },
    preview: { bg: '#7C3AED', text: '#ffffff', accent: '#F472B6', thumbnail: '/templates/67cka.webp' },
  },
  {
    id: 'quote-gradient', name: '명언 카드', category: 'gradient',
    style: { layoutType: 'text-only', bgGradient: 'linear-gradient(180deg, #8B5CF6 0%, #F472B6 100%)', bgColor: '#8B5CF6', color: '#ffffff', strokeWidth: 0, headlineFontSize: 36, bodyFontSize: 13, textAlign: 'center', headlineBodyGap: 20, accentColor: '#ffffff', aspectRatio: '1:1', textPosition: 'center' },
    preview: { bg: '#8B5CF6', text: '#ffffff', thumbnail: '/templates/3KWty.webp' },
  },
  {
    id: 'neon-dark', name: '네온 다크', category: 'gradient',
    style: { layoutType: 'text-only', bgGradient: 'linear-gradient(160deg, #0A0A0F 0%, #1A1035 100%)', bgColor: '#0A0A0F', color: '#ffffff', strokeWidth: 0, headlineFontSize: 38, bodyFontSize: 14, textAlign: 'left', headlineBodyGap: 20, accentColor: '#00FF88', aspectRatio: '1:1' },
    preview: { bg: '#0A0A0F', text: '#ffffff', accent: '#00FF88', thumbnail: '/templates/Jx4So.webp' },
  },
  {
    id: 'pastel-soft', name: '파스텔 소프트', category: 'gradient',
    style: { layoutType: 'text-only', bgGradient: 'linear-gradient(135deg, #FFF0F5 0%, #F0F4FF 50%, #F0FFF4 100%)', bgColor: '#FFF0F5', color: '#2D2D2D', strokeWidth: 0, headlineFontSize: 34, bodyFontSize: 14, textAlign: 'left', headlineBodyGap: 16, accentColor: '#C06090', aspectRatio: '1:1' },
    preview: { bg: '#FFF0F5', text: '#2D2D2D', accent: '#C06090', thumbnail: '/templates/LTjz6.webp' },
  },
  {
    id: 'bold-gradient', name: '볼드 레드', category: 'gradient',
    style: { layoutType: 'text-only', bgGradient: 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)', bgColor: '#FF416C', color: '#ffffff', strokeWidth: 0, headlineFontSize: 44, bodyFontSize: 15, textAlign: 'left', headlineBodyGap: 20, accentColor: '#ffffff', aspectRatio: '4:5' },
    preview: { bg: '#FF416C', text: '#ffffff', thumbnail: '/templates/W8uXw.webp' },
  },
  // ─── Photo Background (사진 배경) ───
  {
    id: 'photo-cover', name: '포토 커버', category: 'photo',
    style: { layoutType: 'photo-bg', bgColor: '#18181b', color: '#ffffff', strokeWidth: 0, headlineFontSize: 36, bodyFontSize: 14, textAlign: 'left', headlineBodyGap: 24, accentColor: '#8B5CF6', aspectRatio: '4:5', textPosition: 'bottom' },
    preview: { bg: '#18181b', text: '#ffffff', accent: '#8B5CF6', thumbnail: '/templates/dFHed.webp' },
  },
  {
    id: 'photo-quote', name: '포토 명언', category: 'photo',
    style: { layoutType: 'photo-bg', bgColor: '#18181b', color: '#ffffff', strokeWidth: 0, headlineFontSize: 32, bodyFontSize: 13, textAlign: 'left', headlineBodyGap: 16, accentColor: '#8B5CF6', aspectRatio: '4:5', textPosition: 'bottom' },
    preview: { bg: '#18181b', text: '#ffffff', accent: '#8B5CF6', thumbnail: '/templates/EWMc4.webp' },
  },
  {
    id: 'photo-full', name: '사진 풀블리드', category: 'photo',
    style: { layoutType: 'photo-bg', bgColor: '#000000', color: '#ffffff', strokeWidth: 0, headlineFontSize: 34, bodyFontSize: 14, textAlign: 'left', headlineBodyGap: 14, accentColor: '#ffffff', aspectRatio: '1:1', textPosition: 'bottom' },
    preview: { bg: '#000000', text: '#ffffff', thumbnail: '/templates/ha5Di.webp' },
  },
  {
    id: 'story-cover', name: '스토리 커버', category: 'photo',
    style: { layoutType: 'photo-bg', bgColor: '#000000', color: '#ffffff', strokeWidth: 0, headlineFontSize: 40, bodyFontSize: 15, textAlign: 'center', headlineBodyGap: 16, accentColor: '#ffffff', aspectRatio: '9:16', textPosition: 'center' },
    preview: { bg: '#000000', text: '#ffffff', thumbnail: '/templates/aaGd7.webp' },
  },
  // ─── Special Layout (분할 레이아웃) ───
  {
    id: 'content-split', name: '콘텐츠 스플릿', category: 'layout',
    style: { layoutType: 'split-top', bgColor: '#ffffff', color: '#18181b', strokeWidth: 0, headlineFontSize: 26, bodyFontSize: 13, textAlign: 'left', headlineBodyGap: 12, accentColor: '#8B5CF6', aspectRatio: '4:5' },
    preview: { bg: '#ffffff', text: '#18181b', accent: '#8B5CF6', thumbnail: '/templates/Lhf2G.webp' },
  },
  {
    id: 'magazine-editorial', name: '매거진 에디토리얼', category: 'layout',
    style: { layoutType: 'split-top', bgColor: '#ffffff', color: '#1a1a1a', strokeWidth: 0, headlineFontSize: 24, bodyFontSize: 13, textAlign: 'left', headlineBodyGap: 10, accentColor: '#E74C3C', aspectRatio: '4:5' },
    preview: { bg: '#ffffff', text: '#1a1a1a', accent: '#E74C3C', thumbnail: '/templates/Q8nup.webp' },
  },
  {
    id: 'landscape-split', name: '랜드스케이프', category: 'layout',
    style: { layoutType: 'split-left', bgGradient: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)', bgColor: '#0F172A', color: '#ffffff', strokeWidth: 0, headlineFontSize: 28, bodyFontSize: 13, textAlign: 'left', headlineBodyGap: 12, accentColor: '#FBBF24', aspectRatio: '16:9' },
    preview: { bg: '#0F172A', text: '#ffffff', accent: '#FBBF24', thumbnail: '/templates/beLft.webp' },
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: 'solid', label: '단색 배경', icon: '■' },
  { id: 'gradient', label: '그라데이션', icon: '◆' },
  { id: 'photo', label: '사진 배경', icon: '◻' },
  { id: 'layout', label: '특수 레이아웃', icon: '⊞' },
] as const;
