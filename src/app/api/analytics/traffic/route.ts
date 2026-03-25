import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export async function POST(request: NextRequest) {
  try {
    const { propertyId, clientEmail, privateKey, period = '30d' } = await request.json();

    if (!propertyId || !clientEmail || !privateKey) {
      return NextResponse.json({ error: 'GA4 설정이 필요합니다' }, { status: 400 });
    }

    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
    });

    const startDate = period === '7d' ? '7daysAgo' : '30daysAgo';

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate: 'today' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
      ],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    });

    const totalSessions = (response.rows ?? []).reduce(
      (sum, r) => sum + parseInt(r.metricValues?.[0]?.value ?? '0', 10), 0
    );

    const sources = (response.rows ?? []).map(r => {
      const sessions = parseInt(r.metricValues?.[0]?.value ?? '0', 10);
      return {
        channel: r.dimensionValues?.[0]?.value ?? 'Unknown',
        sessions,
        users: parseInt(r.metricValues?.[1]?.value ?? '0', 10),
        percentage: totalSessions > 0 ? Math.round((sessions / totalSessions) * 100) : 0,
      };
    });

    return NextResponse.json({ sources });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GA4 API 오류';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
