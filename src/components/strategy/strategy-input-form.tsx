'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useProjectStore } from '@/stores/project-store';
import { Loader2, Plus, X, Sparkles } from 'lucide-react';
import type { StrategyInput } from '@/types/strategy';

interface StrategyInputFormProps {
  onSubmit: (input: StrategyInput) => void;
  isGenerating: boolean;
}

export function StrategyInputForm({ onSubmit, isGenerating }: StrategyInputFormProps) {
  const { selectedProjectId, projects } = useProjectStore();
  const project = projects.find((p) => p.id === selectedProjectId);

  const [targetUrls, setTargetUrls] = useState<string[]>(['']);
  const [industry, setIndustry] = useState(project?.industry || '');
  const [services, setServices] = useState(project?.brand_description || '');
  const [targetCustomer, setTargetCustomer] = useState(() => {
    if (!project?.target_audience) return '';
    if (typeof project.target_audience === 'string') return project.target_audience;
    return Object.values(project.target_audience).filter(Boolean).join(', ');
  });
  const [usp, setUsp] = useState(project?.usp || '');
  const [channels, setChannels] = useState(project?.brand_name ? '네이버 블로그, 인스타그램, 유튜브, 스레드' : '');
  const [seedKeywords, setSeedKeywords] = useState('');
  const [competitors, setCompetitors] = useState<{ name: string; url?: string }[]>([]);
  const [competitorInput, setCompetitorInput] = useState('');
  const [monthlyRange, setMonthlyRange] = useState('');
  const [teamSize, setTeamSize] = useState('1');

  const handleSubmit = () => {
    const input: StrategyInput = {
      targetUrls: targetUrls.filter(Boolean),
      businessInfo: {
        industry,
        services,
        targetCustomer,
        usp,
        channels: channels.split(',').map((c) => c.trim()).filter(Boolean),
      },
      seedKeywords: seedKeywords.split(',').map((k) => k.trim()).filter(Boolean),
      competitors,
      budget: monthlyRange ? { monthlyRange, teamSize: parseInt(teamSize) || 1 } : undefined,
    };
    onSubmit(input);
  };

  const addUrl = () => setTargetUrls([...targetUrls, '']);
  const removeUrl = (i: number) => setTargetUrls(targetUrls.filter((_, idx) => idx !== i));
  const updateUrl = (i: number, v: string) => setTargetUrls(targetUrls.map((u, idx) => (idx === i ? v : u)));

  const addCompetitor = () => {
    if (!competitorInput.trim()) return;
    setCompetitors([...competitors, { name: competitorInput.trim() }]);
    setCompetitorInput('');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">AI 마케팅 전략 생성</h2>
        <p className="text-sm text-muted-foreground">비즈니스 정보를 입력하면 AI가 통합 마케팅 전략을 수립합니다.</p>
      </div>

      {/* 타겟 URL */}
      <div className="space-y-2">
        <label className="text-sm font-medium">🔗 타겟 URL (선택)</label>
        {targetUrls.map((url, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="https://example.com" value={url} onChange={(e) => updateUrl(i, e.target.value)} />
            {targetUrls.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeUrl(i)}><X size={16} /></Button>
            )}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addUrl}><Plus size={14} className="mr-1" />URL 추가</Button>
      </div>

      {/* 비즈니스 정보 */}
      <div className="space-y-3">
        <label className="text-sm font-medium">🏢 비즈니스 정보 (필수)</label>
        <Input placeholder="업종 (예: 소아 성장 클리닉)" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        <Textarea placeholder="주요 서비스/제품 설명" value={services} onChange={(e) => setServices(e.target.value)} rows={2} />
        <Input placeholder="타겟 고객 (예: 초등학생 자녀를 둔 30~45세 부모)" value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)} />
        <Input placeholder="차별화 포인트 (USP)" value={usp} onChange={(e) => setUsp(e.target.value)} />
        <Input placeholder="보유 채널 (쉼표 구분)" value={channels} onChange={(e) => setChannels(e.target.value)} />
      </div>

      {/* 키워드 시드 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">🔍 핵심 키워드 (필수, 쉼표 구분)</label>
        <Textarea placeholder="성장클리닉, 키크는법, 성조숙증, 성장호르몬" value={seedKeywords} onChange={(e) => setSeedKeywords(e.target.value)} rows={2} />
      </div>

      {/* 경쟁사 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">⚔️ 경쟁사 (선택)</label>
        <div className="flex gap-2">
          <Input placeholder="경쟁사 이름" value={competitorInput} onChange={(e) => setCompetitorInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCompetitor()} />
          <Button variant="outline" onClick={addCompetitor}><Plus size={14} /></Button>
        </div>
        {competitors.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {competitors.map((c, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm">
                {c.name}
                <button onClick={() => setCompetitors(competitors.filter((_, idx) => idx !== i))}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 예산 & 인력 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">💰 월 마케팅 예산 (선택)</label>
          <Input placeholder="예: 300-500만원" value={monthlyRange} onChange={(e) => setMonthlyRange(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">👥 담당 인원</label>
          <Input type="number" min="1" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
        </div>
      </div>

      {/* Submit */}
      <Button className="w-full h-12 text-base" onClick={handleSubmit} disabled={isGenerating || !industry || !seedKeywords}>
        {isGenerating ? (
          <><Loader2 size={18} className="animate-spin mr-2" />전략 생성 중...</>
        ) : (
          <><Sparkles size={18} className="mr-2" />전략 생성하기</>
        )}
      </Button>
    </div>
  );
}
