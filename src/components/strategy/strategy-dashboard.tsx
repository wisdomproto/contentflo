'use client';

import { useState, useCallback } from 'react';
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

  const { isGenerating, generate } = useStrategyGeneration({
    onTabStart: (tab) => {
      if (strategy) {
        updateStrategyStatus(strategy.id, {
          overall: 'generating',
          tabs: { [tab]: { status: 'generating' } } as Record<StrategyTab, { status: 'generating' }>,
        });
      }
    },
    onTabComplete: (tab, data) => {
      if (strategy) {
        updateStrategyTab(strategy.id, tab, data);
      }
    },
    onTabError: (tab, error) => {
      if (strategy) {
        updateStrategyStatus(strategy.id, {
          tabs: { [tab]: { status: 'error', errorMessage: error } } as Record<StrategyTab, { status: 'error'; errorMessage: string }>,
        });
      }
    },
    onComplete: () => {
      if (strategy) {
        updateStrategyStatus(strategy.id, { overall: 'complete' });
      }
    },
  });

  const handleSubmit = useCallback(async (input: StrategyInput) => {
    if (!selectedProjectId) return;
    createOrUpdateStrategy(selectedProjectId, input);

    // 1. Fetch Naver keywords
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

    // 2. Crawl URLs
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

    // 3. Generate strategy
    generate(input, keywordData, crawlData);
  }, [selectedProjectId, createOrUpdateStrategy, generate]);

  if (!project) return null;

  // Show input form if no strategy exists
  if (!strategy || strategy.generationStatus.overall === 'idle') {
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
        stats={strategy.overview?.heroStats || []}
      />
      <StrategyTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabStatuses={strategy.generationStatus.tabs || {
          overview: defaultTabStatus,
          keywords: defaultTabStatus,
          channelStrategy: defaultTabStatus,
          contentStrategy: defaultTabStatus,
          kpiAction: defaultTabStatus,
        }}
      />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          {activeTab === 'overview' && <OverviewTab data={strategy.overview} />}
          {activeTab === 'keywords' && <KeywordTab data={strategy.keywords} naverKeywords={naverKeywords} />}
          {activeTab === 'channelStrategy' && <ChannelTab data={strategy.channelStrategy} />}
          {activeTab === 'contentStrategy' && <ContentTab data={strategy.contentStrategy} />}
          {activeTab === 'kpiAction' && <KpiTab data={strategy.kpiAction} />}
        </div>
      </div>
    </div>
  );
}
