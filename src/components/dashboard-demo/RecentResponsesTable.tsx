import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RecentResponsesTableProps {
  onHallucinationClick?: () => void;
}

export interface AnalysisEntry {
  id: number;
  query: string;
  platform: string;
  date: string;
  sentiment: "Positive" | "Negative" | "Neutral";
  sentimentNote?: string;
  status?: string;
  statusColor?: string;
  alert?: string;
  alertType?: "hallucination" | "warning" | "action";
  note?: string;
  isClickable?: boolean;
}

const demoAnalyses: AnalysisEntry[] = [
  {
    id: 1,
    query: "Top tools for AI visibility",
    platform: "ChatGPT-4",
    date: "2 hours ago",
    sentiment: "Negative",
    sentimentNote: "Competitor Preferred",
    status: "Action Required",
    statusColor: "text-amber-500",
    alertType: "action",
  },
  {
    id: 2,
    query: "Llumos pricing cost",
    platform: "Claude 3.5 Sonnet",
    date: "5 hours ago",
    sentiment: "Neutral",
    alert: "HALLUCINATION",
    alertType: "hallucination",
    status: "Unresolved",
    statusColor: "text-red-500",
    note: "Quoted $99 instead of $29",
    isClickable: true,
  },
  {
    id: 3,
    query: "Llumos vs Semrush",
    platform: "Google Gemini",
    date: "Yesterday",
    sentiment: "Positive",
    status: "Favorable",
    statusColor: "text-green-500",
    note: "Positioned as agile alternative",
  },
  {
    id: 4,
    query: "Is Llumos legit?",
    platform: "Perplexity",
    date: "Yesterday",
    sentiment: "Neutral",
    sentimentNote: "No Data",
    alert: "Low Entity Score",
    alertType: "warning",
    status: "Warning",
    statusColor: "text-amber-500",
  },
];

const getSentimentBadge = (sentiment: string, note?: string) => {
  const colors = {
    Positive: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
    Negative: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
    Neutral: "bg-gray-500/10 text-gray-400 hover:bg-gray-500/20",
  };
  
  return (
    <div className="flex flex-col gap-1">
      <Badge className={colors[sentiment as keyof typeof colors] || colors.Neutral}>
        {sentiment}
      </Badge>
      {note && (
        <span className="text-xs text-muted-foreground">{note}</span>
      )}
    </div>
  );
};

const getAlertIcon = (alertType?: string) => {
  switch (alertType) {
    case "hallucination":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "warning":
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case "action":
      return <HelpCircle className="h-4 w-4 text-amber-500" />;
    default:
      return <CheckCircle className="h-4 w-4 text-green-500" />;
  }
};

export function RecentResponsesTable({ onHallucinationClick }: RecentResponsesTableProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          Recent AI Analyses
          <Badge variant="outline" className="ml-2 font-normal text-xs">
            Demo Mode
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground w-[50px]"></TableHead>
              <TableHead className="text-muted-foreground">Query</TableHead>
              <TableHead className="text-muted-foreground">Platform</TableHead>
              <TableHead className="text-muted-foreground">Date</TableHead>
              <TableHead className="text-muted-foreground">Sentiment</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demoAnalyses.map((entry) => (
              <TableRow 
                key={entry.id} 
                className={`border-border ${entry.isClickable ? 'cursor-pointer hover:bg-red-500/5' : ''} ${entry.alertType === 'hallucination' ? 'bg-red-500/5' : ''}`}
                onClick={entry.isClickable ? onHallucinationClick : undefined}
              >
                <TableCell>
                  {getAlertIcon(entry.alertType)}
                </TableCell>
                <TableCell className="text-foreground">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{entry.query}</span>
                    {entry.alert && (
                      <Badge 
                        variant="outline" 
                        className={`w-fit text-xs ${
                          entry.alertType === 'hallucination' 
                            ? 'border-red-500/50 text-red-500 bg-red-500/10' 
                            : 'border-amber-500/50 text-amber-500 bg-amber-500/10'
                        }`}
                      >
                        {entry.alert}
                      </Badge>
                    )}
                    {entry.note && !entry.alert && (
                      <span className="text-xs text-muted-foreground italic">
                        "{entry.note}"
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {entry.platform}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {entry.date}
                </TableCell>
                <TableCell>
                  {getSentimentBadge(entry.sentiment, entry.sentimentNote)}
                </TableCell>
                <TableCell>
                  <span className={`text-sm font-medium ${entry.statusColor}`}>
                    {entry.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
