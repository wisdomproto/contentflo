'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Instagram, Youtube, Search, MessageCircle } from 'lucide-react';

const API_CONFIGS = [
  {
    provider: 'gemini',
    label: 'Google Gemini',
    icon: Sparkles,
    fields: [{ key: 'api_key', label: 'API Key' }],
  },
  {
    provider: 'instagram',
    label: 'Instagram / Threads',
    icon: Instagram,
    fields: [
      { key: 'app_id', label: 'Meta App ID' },
      { key: 'access_token', label: 'Access Token' },
    ],
  },
  {
    provider: 'youtube',
    label: 'YouTube',
    icon: Youtube,
    fields: [{ key: 'api_key', label: 'API Key' }],
  },
  {
    provider: 'naver',
    label: '네이버 검색광고',
    icon: Search,
    fields: [
      { key: 'license_key', label: 'License Key' },
      { key: 'secret_key', label: 'Secret Key' },
      { key: 'customer_id', label: 'Customer ID' },
    ],
  },
  {
    provider: 'perplexity',
    label: 'Perplexity',
    icon: MessageCircle,
    fields: [{ key: 'api_key', label: 'API Key' }],
  },
];

export function ApiKeysSection() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
        API 키는 Supabase 연동 후 암호화하여 안전하게 저장됩니다. 현재는 UI 미리보기입니다.
      </div>

      {API_CONFIGS.map((config) => {
        const Icon = config.icon;
        return (
          <Card key={config.provider}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Icon size={18} /> {config.label}
                </CardTitle>
                <Badge variant="secondary">미연결</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Input type="password" placeholder={`${field.label} 입력`} disabled />
                </div>
              ))}
              <Button variant="outline" size="sm" disabled>
                연결 테스트
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
