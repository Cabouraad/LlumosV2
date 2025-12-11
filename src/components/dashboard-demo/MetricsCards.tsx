import { TrendingUp, MessageSquare, ThumbsUp, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  {
    title: "Share of Model",
    value: "12%",
    trend: "+2.4%",
    trendPositive: true,
    icon: TrendingUp,
  },
  {
    title: "Brand Mentions",
    value: "1,240",
    trend: null,
    icon: MessageSquare,
  },
  {
    title: "Sentiment Score",
    value: "Positive (8.4/10)",
    trend: null,
    icon: ThumbsUp,
  },
  {
    title: "Hallucination Alerts",
    value: "2",
    trend: null,
    isWarning: true,
    icon: AlertTriangle,
  },
];

export function MetricsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">{metric.title}</span>
              <metric.icon className={`h-5 w-5 ${metric.isWarning ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${metric.isWarning ? 'text-destructive' : 'text-foreground'}`}>
                {metric.value}
              </span>
              {metric.trend && (
                <span className="text-sm font-medium text-green-500 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {metric.trend}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
