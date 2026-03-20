'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Instagram, Youtube, Search, MessageCircle, Eye, EyeOff, Check } from 'lucide-react';
import type { Project, ProjectApiKeys } from '@/types/database';

interface ApiKeysSectionProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
}

const API_CONFIGS = [
  {
    provider: 'naver' as const,
    label: '네이버 검색광고',
    description: '키워드 검색량, 경쟁률 분석에 사용',
    icon: Search,
    fields: [
      { key: 'licenseKey', label: 'License Key (API Key)', placeholder: 'API 라이선스 키' },
      { key: 'secretKey', label: 'Secret Key', placeholder: '시크릿 키' },
      { key: 'customerId', label: 'Customer ID', placeholder: '고객 ID (숫자)' },
    ],
  },
  {
    provider: 'naverDatalab' as const,
    label: '네이버 DataLab',
    description: '검색 트렌드 분석에 사용 (네이버 개발자센터)',
    icon: Search,
    fields: [
      { key: 'clientId', label: 'Client ID', placeholder: '클라이언트 ID' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: '클라이언트 시크릿' },
    ],
  },
  {
    provider: 'instagram' as const,
    label: 'Instagram (Meta)',
    description: '인스타그램 자동 게시, 인사이트 조회',
    icon: Instagram,
    fields: [
      { key: 'appId', label: 'Meta App ID', placeholder: 'Meta 앱 ID' },
      { key: 'appSecret', label: 'App Secret', placeholder: '앱 시크릿' },
      { key: 'accessToken', label: 'Access Token', placeholder: '액세스 토큰' },
    ],
  },
  {
    provider: 'threads' as const,
    label: 'Threads (Meta)',
    description: '스레드 자동 게시',
    icon: MessageCircle,
    fields: [
      { key: 'appId', label: 'Meta App ID', placeholder: 'Meta 앱 ID' },
      { key: 'appSecret', label: 'App Secret', placeholder: '앱 시크릿' },
      { key: 'accessToken', label: 'Access Token', placeholder: '액세스 토큰' },
    ],
  },
  {
    provider: 'youtube' as const,
    label: 'YouTube',
    description: '유튜브 영상 업로드, 분석',
    icon: Youtube,
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'YouTube Data API 키' },
      { key: 'clientId', label: 'OAuth Client ID', placeholder: 'OAuth 클라이언트 ID' },
      { key: 'clientSecret', label: 'OAuth Client Secret', placeholder: 'OAuth 클라이언트 시크릿' },
      { key: 'refreshToken', label: 'Refresh Token', placeholder: 'OAuth 리프레시 토큰' },
    ],
  },
  {
    provider: 'perplexity' as const,
    label: 'Perplexity',
    description: '팩트체크, 리서치',
    icon: Sparkles,
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Perplexity API 키' },
    ],
  },
];

function ApiKeyCard({
  config,
  values,
  onSave,
}: {
  config: (typeof API_CONFIGS)[number];
  values: Record<string, string>;
  onSave: (provider: string, data: Record<string, string>) => void;
}) {
  const Icon = config.icon;
  const [localValues, setLocalValues] = useState<Record<string, string>>(values);
  const [showValues, setShowValues] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasValues = Object.values(values).some((v) => v);
  const hasChanges = JSON.stringify(localValues) !== JSON.stringify(values);

  const handleSave = () => {
    onSave(config.provider, localValues);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon size={18} /> {config.label}
          </CardTitle>
          <Badge variant={hasValues ? 'default' : 'secondary'} className={hasValues ? 'bg-emerald-600' : ''}>
            {hasValues ? '연결됨' : '미연결'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {config.fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs">{field.label}</Label>
            <Input
              type={showValues ? 'text' : 'password'}
              placeholder={field.placeholder}
              value={localValues[field.key] || ''}
              onChange={(e) => setLocalValues({ ...localValues, [field.key]: e.target.value })}
            />
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={() => setShowValues(!showValues)}>
            {showValues ? <><EyeOff size={14} className="mr-1" />숨기기</> : <><Eye size={14} className="mr-1" />보기</>}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges && !saved}>
            {saved ? <><Check size={14} className="mr-1" />저장됨</> : '저장'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ApiKeysSection({ project, onUpdate }: ApiKeysSectionProps) {
  const apiKeys = (project.api_keys || {}) as ProjectApiKeys;

  const handleSave = (provider: string, data: Record<string, string>) => {
    const updated = { ...apiKeys, [provider]: data };
    onUpdate({ api_keys: updated });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
        API 키는 현재 IndexedDB에 저장됩니다. Supabase 연동 후 서버에 암호화 저장으로 전환 예정입니다.
      </div>

      {API_CONFIGS.map((config) => {
        const values: Record<string, string> = {};
        const providerData = apiKeys[config.provider as keyof ProjectApiKeys];
        if (providerData && typeof providerData === 'object') {
          for (const field of config.fields) {
            values[field.key] = (providerData as Record<string, string>)[field.key] || '';
          }
        }
        return (
          <ApiKeyCard
            key={config.provider}
            config={config}
            values={values}
            onSave={handleSave}
          />
        );
      })}
    </div>
  );
}
