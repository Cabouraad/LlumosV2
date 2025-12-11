import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const responses = [
  {
    date: "Oct 24",
    platform: "ChatGPT-4",
    query: "Best CRM for small biz",
    sentiment: "Neutral",
    status: "Mentioned 3rd",
  },
  {
    date: "Oct 23",
    platform: "Claude",
    query: "Top project management tools",
    sentiment: "Positive",
    status: "Mentioned 1st",
  },
  {
    date: "Oct 22",
    platform: "Gemini",
    query: "Affordable marketing software",
    sentiment: "Positive",
    status: "Mentioned 2nd",
  },
  {
    date: "Oct 21",
    platform: "ChatGPT-4",
    query: "Best analytics dashboard",
    sentiment: "Negative",
    status: "Not mentioned",
  },
  {
    date: "Oct 20",
    platform: "Claude",
    query: "Enterprise software comparison",
    sentiment: "Neutral",
    status: "Mentioned 4th",
  },
];

const getSentimentColor = (sentiment: string) => {
  switch (sentiment) {
    case "Positive":
      return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
    case "Negative":
      return "bg-destructive/10 text-destructive hover:bg-destructive/20";
    default:
      return "bg-muted text-muted-foreground hover:bg-muted";
  }
};

const getStatusColor = (status: string) => {
  if (status === "Mentioned 1st") return "text-green-500";
  if (status === "Not mentioned") return "text-destructive";
  return "text-muted-foreground";
};

export function RecentResponsesTable() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Recent AI Responses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Date</TableHead>
              <TableHead className="text-muted-foreground">Platform</TableHead>
              <TableHead className="text-muted-foreground">Query</TableHead>
              <TableHead className="text-muted-foreground">Sentiment</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses.map((response, index) => (
              <TableRow key={index} className="border-border">
                <TableCell className="text-foreground">{response.date}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {response.platform}
                  </Badge>
                </TableCell>
                <TableCell className="text-foreground max-w-[200px] truncate">
                  {response.query}
                </TableCell>
                <TableCell>
                  <Badge className={getSentimentColor(response.sentiment)}>
                    {response.sentiment}
                  </Badge>
                </TableCell>
                <TableCell className={getStatusColor(response.status)}>
                  {response.status}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
