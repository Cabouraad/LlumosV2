import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const FEATURES = [
  {
    category: 'AI Platform Coverage',
    features: [
      { name: 'ChatGPT (OpenAI)', free: true, starter: true, growth: true, pro: true, agency: true },
      { name: 'Perplexity AI', free: false, starter: true, growth: true, pro: true, agency: true },
      { name: 'Google Gemini', free: false, starter: false, growth: true, pro: true, agency: true },
      { name: 'Google AI Overviews', free: false, starter: false, growth: true, pro: true, agency: true }
    ]
  },
  {
    category: 'Tracking & Monitoring',
    features: [
      { name: 'Team members', free: '1 user', starter: '1 user', growth: '3 users', pro: '5 users', agency: '10 users' },
      { name: 'Prompt tracking', free: '5 weekly', starter: '25 daily', growth: '100 daily', pro: '200 daily', agency: '300 daily' },
      { name: 'Brands', free: '1 brand', starter: '1 brand', growth: '3 brands', pro: '3 brands', agency: '10 brands' },
      { name: 'Real-time updates', free: false, starter: true, growth: true, pro: true, agency: true },
      { name: 'Historical data', free: false, starter: '30 days', growth: '90 days', pro: 'Unlimited', agency: 'Unlimited' },
      { name: 'Brand catalog tracking', free: false, starter: true, growth: true, pro: true, agency: true }
    ]
  },
  {
    category: 'Visibility Analytics',
    features: [
      { name: 'Visibility scoring', free: 'Basic', starter: 'Basic', growth: 'Advanced', pro: 'Advanced', agency: 'Advanced' },
      { name: 'Competitor tracking', free: false, starter: false, growth: '50 competitors', pro: '50 competitors', agency: '50 competitors' },
      { name: 'Market positioning insights', free: false, starter: false, growth: true, pro: true, agency: true },
      { name: 'Trend analysis', free: false, starter: false, growth: true, pro: true, agency: true }
    ]
  },
  {
    category: 'Recommendations & Content',
    features: [
      { name: 'AI-powered optimizations', free: false, starter: false, growth: true, pro: true, agency: true },
      { name: 'Content suggestions', free: false, starter: false, growth: true, pro: true, agency: true },
      { name: 'Content Studio', free: false, starter: false, growth: true, pro: true, agency: true },
      { name: 'Positioning recommendations', free: false, starter: false, growth: true, pro: true, agency: true },
      { name: 'Custom optimization plans', free: false, starter: false, growth: false, pro: true, agency: true }
    ]
  },
  {
    category: 'Reporting & Support',
    features: [
      { name: 'Weekly email reports', free: false, starter: true, growth: true, pro: true, agency: true },
      { name: 'Advanced reporting dashboard', free: false, starter: false, growth: true, pro: true, agency: true },
      { name: 'Export capabilities', free: false, starter: false, growth: true, pro: true, agency: true },
      { name: 'White-label reports', free: false, starter: false, growth: false, pro: false, agency: true },
      { name: 'Email support', free: true, starter: true, growth: 'Priority', pro: 'Priority', agency: 'Priority' },
      { name: 'Dedicated account manager', free: false, starter: false, growth: false, pro: false, agency: true }
    ]
  }
];

export function FeatureComparisonTable() {
  const renderValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <CheckCircle className="w-5 h-5 text-primary mx-auto" />
      ) : (
        <XCircle className="w-5 h-5 text-muted-foreground/30 mx-auto" />
      );
    }
    return <span className="text-sm font-medium">{value}</span>;
  };

  return (
    <Card className="shadow-elevated">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Feature Comparison</CardTitle>
        <p className="text-center text-muted-foreground">
          Compare features across all plans
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left p-4 font-semibold">Feature</th>
                <th className="text-center p-4 font-semibold">
                  <div>Free</div>
                  <Badge variant="outline" className="mt-1 text-xs">$0/mo</Badge>
                </th>
                <th className="text-center p-4 font-semibold">
                  <div>Starter</div>
                  <Badge variant="outline" className="mt-1 text-xs">$49/mo</Badge>
                </th>
                <th className="text-center p-4 font-semibold bg-primary/5">
                  <div>Growth</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Badge className="text-xs">Most Popular</Badge>
                    <Badge variant="outline" className="text-xs">$99/mo</Badge>
                  </div>
                </th>
                <th className="text-center p-4 font-semibold">
                  <div>Pro</div>
                  <Badge variant="outline" className="mt-1 text-xs">$225/mo</Badge>
                </th>
                <th className="text-center p-4 font-semibold">
                  <div>Agency</div>
                  <Badge variant="outline" className="mt-1 text-xs">$399/mo</Badge>
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((category, catIndex) => (
                <>
                  <tr key={`cat-${catIndex}`} className="bg-muted/10">
                    <td colSpan={6} className="p-3 font-semibold text-sm">
                      {category.category}
                    </td>
                  </tr>
                  {category.features.map((feature, featIndex) => (
                    <tr 
                      key={`feat-${catIndex}-${featIndex}`}
                      className={`border-b ${featIndex % 2 === 0 ? 'bg-background' : 'bg-muted/5'}`}
                    >
                      <td className="p-4 text-sm">{feature.name}</td>
                      <td className="p-4 text-center">{renderValue(feature.free)}</td>
                      <td className="p-4 text-center">{renderValue(feature.starter)}</td>
                      <td className="p-4 text-center bg-primary/5">{renderValue(feature.growth)}</td>
                      <td className="p-4 text-center">{renderValue(feature.pro)}</td>
                      <td className="p-4 text-center">{renderValue(feature.agency)}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}