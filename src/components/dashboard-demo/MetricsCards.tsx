import { TrendingUp, TrendingDown, MessageSquare, ThumbsUp, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MetricsCardsProps {
  onAlertClick?: () => void;
}

const metrics = [
  {
    title: "Share of Model",
    value: "12%",
    trend: "+2.4%",
    trendPositive: true,
    description: "vs competitors",
    icon: TrendingUp,
  },
  {
    title: "Brand Mentions",
    value: "1,240",
    trend: "-3.1%",
    trendPositive: false,
    description: "Last 30 days",
    icon: MessageSquare,
  },
  {
    title: "Sentiment Score",
    value: "8.4/10",
    badge: "Positive",
    badgeColor: "bg-green-500/10 text-green-500",
    description: "Across all platforms",
    icon: ThumbsUp,
  },
  {
    title: "Hallucination Alerts",
    value: "1",
    trend: null,
    isWarning: true,
    isClickable: true,
    description: "Requires attention",
    icon: AlertTriangle,
  },
];

export function MetricsCards({ onAlertClick }: MetricsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card 
          key={metric.title} 
          className={`bg-card border-border ${metric.isClickable ? 'cursor-pointer hover:border-red-500/50 transition-colors' : ''}`}
          onClick={metric.isClickable ? onAlertClick : undefined}
        >
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
                <span className={`text-sm font-medium flex items-center gap-1 ${metric.trendPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {metric.trendPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {metric.trend}
                </span>
              )}
              {metric.badge && (
                <Badge className={metric.badgeColor}>
                  {metric.badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metric.description}
            </p>
            {metric.isClickable && (
              <p className="text-xs text-red-400 mt-1 font-medium">Click to resolve →</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
