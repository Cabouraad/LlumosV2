import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ExternalLink, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CompetitorPage {
  citation_url: string;
  citation_domain: string;
  citation_title: string;
  total_mentions: number;
  unique_prompts: number;
  providers: string[];
}

interface CompetitorPagesDialogProps {
  domain: string;
  pages: CompetitorPage[];
  totalCitations: number;
}

export function CompetitorPagesDialog({ domain, pages, totalCitations }: CompetitorPagesDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredPages = pages.filter(page => 
    page.citation_url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedPages = [...filteredPages].sort((a, b) => b.total_mentions - a.total_mentions);

  // Extract path from URL for display
  const getDisplayUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname + urlObj.search;
    } catch {
      return url;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80">
          View all {pages.length} pages →
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            All Cited Pages from {domain}
            <Badge variant="outline">{totalCitations} total citations</Badge>
          </DialogTitle>
          <DialogDescription>
            {pages.length} unique pages from this domain have been cited by AI models
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-2">
            {sortedPages.map((page, idx) => (
              <a
                key={page.citation_url}
                href={page.citation_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors group"
              >
                <span className="text-xs font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
                  #{idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary" />
                    <span className="text-sm truncate group-hover:text-primary">
                      {getDisplayUrl(page.citation_url)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {page.citation_url}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {page.total_mentions}x
                </Badge>
              </a>
            ))}
            {sortedPages.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No pages match your search
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
