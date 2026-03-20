'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import type { Project } from '@/types/database';

interface AiModelSettings {
  text_model: string;
  image_model: string;
  tts_model: string;
  temperature: number;
  max_tokens: number;
}

const DEFAULTS: AiModelSettings = {
  text_model: 'gemini-3-flash-preview',
  image_model: 'gemini-3.1-flash-image-preview',
  tts_model: 'gemini-3-flash-preview',
  temperature: 0.7,
  max_tokens: 4096,
};

export const TEXT_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];
export const IMAGE_MODELS = [
  'gemini-3.1-flash-image-preview',
  'gemini-3-pro-image-preview',
  'gemini-2.5-flash-image',
  'imagen-4.0-generate-001',
];
const TTS_MODELS = ['gemini-3-flash-preview', 'gemini-3.1-pro-preview', 'gemini-2.5-flash'];

interface AiModelSectionProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

export function AiModelSection({ project, onUpdate }: AiModelSectionProps) {
  const initial = (project.ai_model_settings as unknown as AiModelSettings) ?? DEFAULTS;
  const [settings, setSettings] = useState<AiModelSettings>({ ...DEFAULTS, ...initial });

  useEffect(() => {
    const s = (project.ai_model_settings as unknown as AiModelSettings) ?? DEFAULTS;
    setSettings({ ...DEFAULTS, ...s });
  }, [project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (key: keyof AiModelSettings, value: string | number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onUpdate({ ai_model_settings: settings as unknown as Record<string, unknown> });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI 모델 선택</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>텍스트 생성 모델</Label>
            <Select value={settings.text_model} onValueChange={(v) => { if (v) update('text_model', v); }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_MODELS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>이미지 생성 모델</Label>
            <Select value={settings.image_model} onValueChange={(v) => { if (v) update('image_model', v); }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_MODELS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>TTS 모델</Label>
            <Select value={settings.tts_model} onValueChange={(v) => { if (v) update('tts_model', v); }}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TTS_MODELS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>생성 파라미터</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Temperature</Label>
              <span className="text-sm text-muted-foreground">{settings.temperature.toFixed(1)}</span>
            </div>
            <Slider
              value={[settings.temperature]}
              onValueChange={(v) => update('temperature', Array.isArray(v) ? v[0] : v)}
              min={0}
              max={1}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">낮을수록 일관적, 높을수록 창의적</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>최대 토큰 수</Label>
              <span className="text-sm text-muted-foreground">{settings.max_tokens}</span>
            </div>
            <Slider
              value={[settings.max_tokens]}
              onValueChange={(v) => update('max_tokens', Array.isArray(v) ? v[0] : v)}
              min={256}
              max={8192}
              step={256}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>저장</Button>
      </div>
    </div>
  );
}
