import * as cheerio from 'cheerio';
import type { ImportedKeyword, ImportedCategory, ImportedTopic } from '@/types/analytics';
import { generateId } from './utils';

interface ParseResult {
  keywords: ImportedKeyword[];
  categories: ImportedCategory[];
}

export function parseStrategyHtml(html: string): ParseResult {
  const $ = cheerio.load(html);

  // 지원하는 HTML 형식인지 검증
  if ($('table.kw-table').length === 0 && $('table.topic-table').length === 0 && $('.cycle-item').length === 0) {
    throw new Error('지원하지 않는 HTML 형식입니다. 마케팅 전략 HTML 파일(키워드 테이블 또는 주제 테이블 포함)이 필요합니다.');
  }

  const keywords: ImportedKeyword[] = [];
  const categories: ImportedCategory[] = [];

  // --- 키워드 테이블 파싱 ---
  $('table.kw-table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 4) return;

    const keyword = $(cells[0]).text().trim();
    if (!keyword) return;

    const searchText = $(cells[1]).text().replace(/,/g, '').trim();
    const totalSearch = parseInt(searchText, 10) || 0;

    const compEl = $(cells[3]).find('.comp-badge');
    let competition: 'high' | 'medium' | 'low' = 'medium';
    if (compEl.hasClass('comp-high')) competition = 'high';
    else if (compEl.hasClass('comp-low')) competition = 'low';

    const isGolden = $(row).find('.s-gold').length > 0 ||
      $(row).attr('data-cat') === 'gold';

    const categoryBadge = $(row).find('.sbadge').first().text().trim();

    keywords.push({
      keyword,
      totalSearch,
      competition,
      isGolden,
      category: categoryBadge || undefined,
    });
  });

  // --- 주제 테이블 파싱 ---
  const topicsByCategory: Record<string, ImportedTopic[]> = {};

  $('table.topic-table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const catPill = $(cells[1]).find('.cat-pill').first();
    const catCode = catPill.text().trim().charAt(0);
    const title = $(cells[2]).text().trim();
    if (!title) return;

    const kwTags: string[] = [];
    $(cells[3]).find('.kw-tag').each((_, el) => {
      kwTags.push($(el).text().trim());
    });

    const channels: string[] = [];
    if (cells.length > 4) {
      $(cells[4]).find('span, .sch-cell').each((_, el) => {
        channels.push($(el).text().trim());
      });
    }

    let status: 'new' | 'done' | 'similar' = 'new';
    if ($(row).find('.s-done').length > 0) status = 'done';
    else if ($(row).find('.s-similar').length > 0) status = 'similar';

    if (!topicsByCategory[catCode]) {
      topicsByCategory[catCode] = [];
    }

    topicsByCategory[catCode].push({
      id: generateId('topic'),
      title,
      keywords: kwTags,
      channels,
      status,
    });
  });

  // --- 카테고리 순환 파싱 ---
  $('.cycle-item').each((_, el) => {
    const code = $(el).find('.cycle-letter').text().trim();
    const name = $(el).find('.cycle-name').text().trim();
    const description = $(el).find('.cycle-desc').text().trim();
    if (!code || !name) return;

    categories.push({
      code,
      name,
      description,
      topics: topicsByCategory[code] ?? [],
    });
  });

  // 카테고리 없이 주제만 있는 경우 fallback
  if (categories.length === 0 && Object.keys(topicsByCategory).length > 0) {
    for (const [code, topics] of Object.entries(topicsByCategory)) {
      categories.push({
        code,
        name: code,
        description: '',
        topics,
      });
    }
  }

  return { keywords, categories };
}
