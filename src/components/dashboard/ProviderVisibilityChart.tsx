import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Layers } from 'lucide-react';

interface ProviderDailyRow {
  date: string;
  provider: string;
  total: number;
  present: number;
}

interface ProviderVisibilityChartProps {
  responses: any[];
  providerDaily?: ProviderDailyRow[];
  isLoading?: boolean;
}

const PROVIDER_CONFIG: Record<string, { label: string; color: string; aliases: string[] }> = {
  'openai': { label: 'ChatGPT', color: '#10a37f', aliases: ['openai', 'chatgpt', 'gpt'] },
  'perplexity': { label: 'Perplexity', color: '#8b5cf6', aliases: ['perplexity'] },
  'gemini': { label: 'Gemini', color: '#4285f4', aliases: ['gemini'] },
  'google': { label: 'Google AI Overviews', color: '#ea4335', aliases: ['google_ai_overviews', 'google_aio', 'aio', 'google'] },
};

const ProviderVisibilityChartComponent = ({ responses, providerDaily, isLoading }: ProviderVisibilityChartProps) => {
  const chartData = useMemo(() => {
    // Prefer pre-aggregated daily data from RPC (covers full 7-day window)
    if (Array.isArray(providerDaily) && providerDaily.length > 0) {
      const DAY_MS = 24 * 60 * 60 * 1000;
      const baseDay = new Date();
      baseDay.setHours(0, 0, 0, 0);
      baseDay.setDate(baseDay.getDate() - 6);
      const baseDayMs = baseDay.getTime();
      const endMs = baseDayMs + 7 * DAY_MS;

      const days: any[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(baseDayMs + i * DAY_MS);
        const row: any = { date: d.toISOString(), hasData: false };
        Object.keys(PROVIDER_CONFIG).forEach((k) => { row[k] = null; });
        days.push(row);
      }

      const buckets: Record<number, Record<string, { total: number; present: number }>> = {};
      for (const row of providerDaily) {
        const ts = Date.parse(row.date);
        if (!Number.isFinite(ts) || ts < baseDayMs || ts >= endMs) continue;
        const dayIndex = Math.floor((ts - baseDayMs) / DAY_MS);
        if (dayIndex < 0 || dayIndex >= 7) continue;

        const providerLower = String(row.provider || '').toLowerCase();
        const matchedKey = Object.keys(PROVIDER_CONFIG).find((k) =>
          PROVIDER_CONFIG[k].aliases.some((alias) => providerLower.includes(alias))
        );
        if (!matchedKey) continue;

        if (!buckets[dayIndex]) buckets[dayIndex] = {};
        if (!buckets[dayIndex][matchedKey]) buckets[dayIndex][matchedKey] = { total: 0, present: 0 };
        buckets[dayIndex][matchedKey].total += Number(row.total) || 0;
        buckets[dayIndex][matchedKey].present += Number(row.present) || 0;
      }

      for (let i = 0; i < 7; i++) {
        const dayBuckets = buckets[i];
        if (!dayBuckets) continue;
        for (const [key, stats] of Object.entries(dayBuckets)) {
          if (stats.total > 0) {
            days[i][key] = Math.round((stats.present / stats.total) * 100);
            days[i].hasData = true;
          }
        }
      }

      const daysWithData = days.filter((d: any) => d.hasData);
      return daysWithData.slice(-5).map(({ hasData, ...rest }: any) => rest);
    }

    // Fallback: legacy per-response calculation
    if (!responses || responses.length === 0) return [];

    const allDays: any[] = [];
    
    // Create 7 days of data to ensure we can find 5 with actual data
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() - i);
      dayDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(dayDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      // Filter responses for this day
      const dayResponses = responses.filter((response: any) => {
        const responseDate = new Date(response.run_at || response.created_at);
        return responseDate >= dayDate && responseDate < nextDay && 
               (response.status === 'success' || response.status === 'completed');
      });

      const dayData: any = {
        date: dayDate.toISOString(),
        hasData: false,
      };

      // Calculate presence rate for each provider
      Object.keys(PROVIDER_CONFIG).forEach(providerKey => {
        const providerResponses = dayResponses.filter((r: any) => {
          const provider = r.provider?.toLowerCase() || '';
          return provider.includes(providerKey);
        });
        
        const total = providerResponses.length;
        const present = providerResponses.filter((r: any) => r.org_brand_present === true).length;
        dayData[providerKey] = total > 0 ? Math.round((present / total) * 100) : null;
        if (total > 0) dayData.hasData = true;
      });

      allDays.push(dayData);
    }

    // Filter to only days with data, then take the most recent 5
    const daysWithData = allDays.filter(day => day.hasData);
    const result = daysWithData.slice(-5);
    
    // Clean up the hasData flag before returning
    return result.map(({ hasData, ...rest }) => rest);
  }, [responses, providerDaily]);

  // Get active providers (ones with data)
  const activeProviders = useMemo(() => {
    if (chartData.length === 0) return [];
    
    return Object.keys(PROVIDER_CONFIG).filter(key => 
      chartData.some(day => day[key] !== null && day[key] !== undefined)
    );
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border shadow-soft">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-primary" />
            <CardTitle>Visibility by AI Platform</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur-sm border shadow-soft">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Layers className="h-5 w-5 text-primary" />
          <CardTitle>Visibility by AI Platform</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {activeProviders.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No provider data available yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                  label={{ value: 'Presence %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'short', 
                    day: 'numeric' 
                  })}
                  formatter={(value: any, name: string) => {
                    const config = PROVIDER_CONFIG[name];
                    return value !== null ? [`${value}%`, config?.label || name] : ['No data', config?.label || name];
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend 
                  formatter={(value) => PROVIDER_CONFIG[value]?.label || value}
                />
                {activeProviders.map((providerKey) => (
                  <Line 
                    key={providerKey}
                    type="monotone" 
                    dataKey={providerKey} 
                    stroke={PROVIDER_CONFIG[providerKey].color} 
                    strokeWidth={2}
                    name={providerKey}
                    dot={{ fill: PROVIDER_CONFIG[providerKey].color, strokeWidth: 1, r: 3 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const ProviderVisibilityChart = memo(ProviderVisibilityChartComponent);
