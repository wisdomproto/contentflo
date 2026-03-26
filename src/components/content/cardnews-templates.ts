import type { CardTextStyle } from './cardnews-card-item';

export interface CardTemplate {
  id: string;
  name: string;
  category: 'solid' | 'gradient' | 'photo' | 'layout';
  style: Partial<CardTextStyle>;
  preview: { bg: string; text: string; accent?: string; thumbnail?: string };
}

export const CARD_TEMPLATES: CardTemplate[] = [
  // ─── Solid Background ───
  {
    id: 'clean-white', name: '클린 화이트', category: 'solid',
    style: { layoutType: 'standard', bgColor: '#ffffff', color: '#1a1a1a', strokeWidth: 0, headlineFontSize: 22, bodyFontSize: 13, textAlign: 'center', headlineBodyGap: 6, aspectRatio: '4:5' },
    preview: { bg: '#ffffff', text: '#1a1a1a', thumbnail: '/templates/75f38.webp' },
  },
  {
    id: 'dark-modern', name: '다크 모던', category: 'solid',
    style: { layoutType: 'standard', bgColor: '#1a1a2e', color: '#ffffff', strokeWidth: 0, headlineFontSize: 22, bodyFontSize: 13, textAlign: 'center', headlineBodyGap: 6, aspectRatio: '4:5' },
    preview: { bg: '#1a1a2e', text: '#ffffff', thumbnail: '/templates/soupF.webp' },
  },
  {
    id: 'navy-blue', name: '네이비 블루', category: 'solid',
    style: { layoutType: 'standard', bgColor: '#0f3460', color: '#e8f1f8', strokeWidth: 0, headlineFontSize: 24, bodyFontSize: 14, textAlign: 'center', headlineBodyGap: 8, aspectRatio: '4:5' },
    preview: { bg: '#0f3460', text: '#e8f1f8', thumbnail: '/templates/67cka.webp' },
  },
  {
    id: 'forest-green', name: '포레스트 그린', category: 'solid',
    style: { layoutType: 'standard', bgColor: '#2d6a4f', color: '#f0fdf4', strokeWidth: 0, headlineFontSize: 22, bodyFontSize: 13, textAlign: 'center', headlineBodyGap: 6, aspectRatio: '4:5' },
    preview: { bg: '#2d6a4f', text: '#f0fdf4', thumbnail: '/templates/tUZMv.webp' },
  },
  {
    id: 'coral-pink', name: '코랄 핑크', category: 'solid',
    style: { layoutType: 'standard', bgColor: '#e76f51', color: '#ffffff', strokeWidth: 0, headlineFontSize: 22, bodyFontSize: 13, textAlign: 'center', headlineBodyGap: 6, aspectRatio: '4:5' },
    preview: { bg: '#e76f51', text: '#ffffff', thumbnail: '/templates/W8uXw.webp' },
  },
  {
    id: 'royal-purple', name: '로얄 퍼플', category: 'solid',
    style: { layoutType: 'standard', bgColor: '#533483', color: '#f3e8ff', strokeWidth: 0, headlineFontSize: 22, bodyFontSize: 13, textAlign: 'center', headlineBodyGap: 6, aspectRatio: '4:5' },
    preview: { bg: '#533483', text: '#f3e8ff', thumbnail: '/templates/3KWty.webp' },
  },
  {
    id: 'pastel-beige', name: '파스텔 베이지', category: 'solid',
    style: { layoutType: 'standard', bgColor: '#fdf6ec', color: '#5c4033', strokeWidth: 0, headlineFontSize: 20, bodyFontSize: 12, textAlign: 'center', headlineBodyGap: 4, aspectRatio: '4:5' },
    preview: { bg: '#fdf6ec', text: '#5c4033', thumbnail: '/templates/UYE3a.webp' },
  },
  {
    id: 'bold-black', name: '볼드 블랙', category: 'solid',
    style: { layoutType: 'standard', bgColor: '#000000', color: '#ffd93d', strokeWidth: 1, strokeColor: '#000000', headlineFontSize: 26, bodyFontSize: 14, textAlign: 'center', headlineBodyGap: 8, aspectRatio: '4:5' },
    preview: { bg: '#000000', text: '#ffd93d', thumbnail: '/templates/soupF.webp' },
  },
  // ─── Gradient Background ───
  {
    id: 'minimal-accent', name: '미니멀 악센트', category: 'solid',
    style: { layoutType: 'text-only', bgColor: '#ffffff', color: '#1a1a1a', strokeWidth: 0, headlineFontSize: 28, bodyFontSize: 13, textAlign: 'left', headlineBodyGap: 10, accentColor: '#FF6B35', aspectRatio: '1:1' },
    preview: { bg: '#ffffff', text: '#1a1a1a', accent: '#FF6B35', thumbnail: '/templates/eANJ2.webp' },
  },
  {
    id: 'neon-dark', name: '네온 다크', category: 'gradient',
    style: { layoutType: 'text-only', bgGradient: 'linear-gradient(160deg, #0A0A0F 0%, #1A1035 100%)', bgColor: '#0A0A0F', color: '#ffffff', strokeWidth: 0, headlineFontSize: 28, bodyFontSize: 13, textAlign: 'left', headlineBodyGap: 12, accentColor: '#00FF88', aspectRatio: '1:1' },
    preview: { bg: '#0A0A0F', text: '#ffffff', accent: '#00FF88', thumbnail: '/templates/Jx4So.webp' },
  },
  {
    id: 'pastel-soft', name: '파스텔 소프트', category: 'gradient',
    style: { layoutType: 'text-only', bgGradient: 'linear-gradient(135deg, #FFF0F5 0%, #F0F4FF 50%, #F0FFF4 100%)', bgColor: '#FFF0F5', color: '#2D2D2D', strokeWidth: 0, headlineFontSize: 26, bodyFontSize: 13, textAlign: 'left', headlineBodyGap: 10, accentColor: '#C06090', aspectRatio: '1:1' },
    preview: { bg: '#FFF0F5', text: '#2D2D2D', accent: '#C06090', thumbnail: '/templates/LTjz6.webp' },
  },
  {
    id: 'bold-gradient', name: '볼드 레드', category: 'gradient',
    style: { layoutType: 'text-only', bgGradient: 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)', bgColor: '#FF416C', color: '#ffffff', strokeWidth: 0, headlineFontSize: 32, bodyFontSize: 14, textAlign: 'left', headlineBodyGap: 14, accentColor: '#ffffff', aspectRatio: '4:5' },
    preview: { bg: '#FF416C', text: '#ffffff', thumbnail: '/templates/W8uXw.webp' },
  },
  {
    id: 'purple-cover', name: '퍼플 커버', category: 'gradient',
    style: { layoutType: 'text-only', bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', bgColor: '#764ba2', color: '#ffffff', strokeWidth: 0, headlineFontSize: 30, bodyFontSize: 14, textAlign: 'left', headlineBodyGap: 10, accentColor: '#ffffff', aspectRatio: '1:1' },
    preview: { bg: '#764ba2', text: '#ffffff', thumbnail: '/templates/67cka.webp' },
  },
  {
    id: 'quote-gradient', name: '명언 카드', category: 'gradient',
    style: { layoutType: 'text-only', bgGradient: 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)', bgColor: '#667eea', color: '#ffffff', strokeWidth: 0, headlineFontSize: 26, bodyFontSize: 12, textAlign: 'center', headlineBodyGap: 16, accentColor: '#ffffff', aspectRatio: '1:1', textPosition: 'center' },
    preview: { bg: '#667eea', text: '#ffffff', thumbnail: '/templates/3KWty.webp' },
  },
  // ─── Photo Background ───
  {
    id: 'photo-overlay', name: '사진 오버레이', category: 'photo',
    style: { layoutType: 'photo-bg', bgColor: '#000000', color: '#ffffff', strokeWidth: 0, headlineFontSize: 26, bodyFontSize: 13, textAlign: 'left', headlineBodyGap: 10, accentColor: '#ffffff', aspectRatio: '1:1', textPosition: 'bottom' },
    preview: { bg: '#333333', text: '#ffffff', thumbnail: '/templates/ha5Di.webp' },
  },
  {
    id: 'story-cover', name: '스토리 커버', category: 'photo',
    style: { layoutType: 'photo-bg', bgColor: '#000000', color: '#ffffff', strokeWidth: 0, headlineFontSize: 30, bodyFontSize: 14, textAlign: 'center', headlineBodyGap: 12, accentColor: '#ffffff', aspectRatio: '9:16', textPosition: 'center' },
    preview: { bg: '#1a3a4a', text: '#ffffff', thumbnail: '/templates/aaGd7.webp' },
  },
  // ─── Special Layout ───
  {
    id: 'magazine-split', name: '매거진 스플릿', category: 'layout',
    style: { layoutType: 'split-top', bgColor: '#ffffff', color: '#1a1a1a', strokeWidth: 0, headlineFontSize: 22, bodyFontSize: 12, textAlign: 'left', headlineBodyGap: 8, accentColor: '#E74C3C', aspectRatio: '4:5' },
    preview: { bg: '#ffffff', text: '#1a1a1a', accent: '#E74C3C', thumbnail: '/templates/Lhf2G.webp' },
  },
  {
    id: 'landscape-split', name: '랜드스케이프', category: 'layout',
    style: { layoutType: 'split-left', bgGradient: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)', bgColor: '#0F172A', color: '#ffffff', strokeWidth: 0, headlineFontSize: 22, bodyFontSize: 12, textAlign: 'left', headlineBodyGap: 8, accentColor: '#FBBF24', aspectRatio: '16:9' },
    preview: { bg: '#0F172A', text: '#ffffff', accent: '#FBBF24', thumbnail: '/templates/beLft.webp' },
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: 'solid', label: '단색 배경', icon: '■' },
  { id: 'gradient', label: '그라데이션', icon: '◆' },
  { id: 'photo', label: '사진 배경', icon: '◻' },
  { id: 'layout', label: '특수 레이아웃', icon: '⊞' },
] as const;
