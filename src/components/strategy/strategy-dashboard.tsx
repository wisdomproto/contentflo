'use client';

import { useState, useCallback, useRef } from 'react';
import { useProjectStore } from '@/stores/project-store';
import { useStrategyGeneration } from '@/hooks/use-strategy-generation';
import { StrategyInputForm } from './strategy-input-form';
import { StrategyHero } from './strategy-hero';
import { StrategyTabs } from './strategy-tabs';
import { OverviewTab } from './overview-tab';
import { KeywordTab } from './keyword-tab';
import { ChannelTab } from './channel-tab';
import { ContentTab } from './content-tab';
import { KpiTab } from './kpi-tab';
import type { StrategyTab, StrategyInput, KeywordItem } from '@/types/strategy';

export function StrategyDashboard() {
  const { selectedProjectId, projects, getStrategy, createOrUpdateStrategy, updateStrategyTab, updateStrategyStatus } = useProjectStore();
  const project = projects.find((p) => p.id === selectedProjectId);
  const strategy = selectedProjectId ? getStrategy(selectedProjectId) : undefined;

  const [activeTab, setActiveTab] = useState<StrategyTab>('overview');
  const [naverKeywords, setNaverKeywords] = useState<KeywordItem[]>([]);
  const [showDashboard, setShowDashboard] = useState(false);

  // Use ref to always get fresh strategy ID in callbacks
  const strategyIdRef = useRef<string | null>(null);

  const { isGenerating, generate } = useStrategyGeneration({
    onTabStart: (tab) => {
      const sid = strategyIdRef.current;
      if (sid) {
        updateStrategyStatus(sid, {
          overall: 'generating',
          tabs: { [tab]: { status: 'generating' } } as Record<StrategyTab, { status: 'generating' }>,
        });
      }
    },
    onTabComplete: (tab, data) => {
      const sid = strategyIdRef.current;
      if (sid) {
        updateStrategyTab(sid, tab, data);
      }
    },
    onTabError: (tab, error) => {
      const sid = strategyIdRef.current;
      if (sid) {
        updateStrategyStatus(sid, {
          tabs: { [tab]: { status: 'error', errorMessage: error } } as Record<StrategyTab, { status: 'error'; errorMessage: string }>,
        });
      }
    },
    onComplete: () => {
      const sid = strategyIdRef.current;
      if (sid) {
        updateStrategyStatus(sid, { overall: 'complete' });
      }
    },
  });

  const handleSubmit = useCallback(async (input: StrategyInput) => {
    if (!selectedProjectId) return;

    // Create strategy and capture ID via ref
    const id = createOrUpdateStrategy(selectedProjectId, input);
    strategyIdRef.current = id;

    // Immediately set status to generating so UI switches to dashboard
    updateStrategyStatus(id, { overall: 'generating' });
    setShowDashboard(true);

    // 1. Fetch Naver keywords (non-blocking on failure)
    let keywordData: KeywordItem[] = [];
    try {
      const kwRes = await fetch('/api/naver/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: input.seedKeywords }),
      });
      if (kwRes.ok) {
        const kwData = await kwRes.json();
        keywordData = (kwData.keywords || []).map((k: { keyword: string; pcSearchVolume: number; mobileSearchVolume: number; totalSearchVolume: number; competition: string; pcClickCount: number; mobileClickCount: number; pcCtr: number; mobileCtr: number }) => ({
          keyword: k.keyword,
          totalSearch: k.totalSearchVolume,
          pcSearch: k.pcSearchVolume,
          mobileSearch: k.mobileSearchVolume,
          mobileRatio: k.totalSearchVolume ? Math.round((k.mobileSearchVolume / k.totalSearchVolume) * 100) : 0,
          competition: (k.competition === 'HIGH' ? 'high' : k.competition === 'MEDIUM' ? 'medium' : 'low') as 'high' | 'medium' | 'low',
          plAvgDepth: 0,
          pcClickCount: k.pcClickCount,
          mobileClickCount: k.mobileClickCount,
          pcCtr: k.pcCtr,
          mobileCtr: k.mobileCtr,
          category: '',
          isGolden: false,
        }));
        setNaverKeywords(keywordData);
      }
    } catch { /* continue without keyword data */ }

    // 2. Crawl URLs (non-blocking on failure)
    let crawlData;
    if (input.targetUrls.length > 0) {
      try {
        const crawlRes = await fetch('/api/ai/strategy/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: input.targetUrls }),
        });
        if (crawlRes.ok) {
          const d = await crawlRes.json();
          crawlData = d.results;
        }
      } catch { /* continue without crawl data */ }
    }

    // 3. Generate strategy via AI
    generate(input, keywordData, crawlData);
  }, [selectedProjectId, createOrUpdateStrategy, updateStrategyStatus, generate]);

  if (!project) return null;

  // Show input form if no strategy and not generating
  const hasStrategy = strategy && (strategy.generationStatus.overall !== 'idle' || showDashboard);
  if (!hasStrategy) {
    return (
      <div className="flex-1 overflow-y-auto">
        <StrategyInputForm onSubmit={handleSubmit} isGenerating={isGenerating} />
      </div>
    );
  }

  const defaultTabStatus = { status: 'idle' as const };

  return (
    <div className="flex flex-col h-full">
      <StrategyHero
        projectName={project.name}
        stats={strategy?.overview?.heroStats || []}
      />
      <StrategyTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabStatuses={strategy?.generationStatus.tabs || {
          overview: defaultTabStatus,
          keywords: defaultTabStatus,
          channelStrategy: defaultTabStatus,
          contentStrategy: defaultTabStatus,
          kpiAction: defaultTabStatus,
        }}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          {isGenerating && !strategy?.overview && activeTab === 'overview' && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">AI가 마케팅 전략을 수립하고 있습니다...</p>
            </div>
          )}
          {activeTab === 'overview' && strategy?.overview && <OverviewTab data={strategy.overview} />}
          {activeTab === 'keywords' && <KeywordTab data={strategy?.keywords || null} naverKeywords={naverKeywords} />}
          {activeTab === 'channelStrategy' && <ChannelTab data={strategy?.channelStrategy || null} />}
          {activeTab === 'contentStrategy' && <ContentTab data={strategy?.contentStrategy || null} />}
          {activeTab === 'kpiAction' && <KpiTab data={strategy?.kpiAction || null} />}
        </div>
      </div>
    </div>
  );
}
