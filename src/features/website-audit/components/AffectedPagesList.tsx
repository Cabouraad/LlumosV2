import { ExternalLink, AlertTriangle, CheckCircle, FileWarning } from 'lucide-react';
import { AuditPage } from '../types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface AffectedPagesListProps {
  pages: AuditPage[];
  checkKey: string;
  totalPages: number;
}

// Define which fields each check examines and what constitutes an issue
const CHECK_PAGE_FILTERS: Record<string, {
  field: keyof AuditPage | 'computed';
  filter: (page: AuditPage) => boolean;
  getIssue: (page: AuditPage) => string;
}> = {
  title_present: {
    field: 'title',
    filter: (page) => !page.title || page.title.trim().length === 0,
    getIssue: () => 'Missing page title'
  },
  meta_description_present: {
    field: 'meta_description',
    filter: (page) => !page.meta_description || page.meta_description.trim().length === 0,
    getIssue: () => 'Missing meta description'
  },
  h1_present: {
    field: 'h1',
    filter: (page) => !page.h1 || page.h1.trim().length === 0,
    getIssue: () => 'Missing H1 tag'
  },
  organization_schema_present: {
    field: 'has_schema',
    filter: (page) => !page.has_schema,
    getIssue: () => 'No structured data found'
  },
  thin_content_pages: {
    field: 'word_count',
    filter: (page) => page.word_count < 300,
    getIssue: (page) => `Only ${page.word_count} words (min recommended: 300)`
  },
  homepage_status_200: {
    field: 'status',
    filter: (page) => page.status !== 200,
    getIssue: (page) => `HTTP status ${page.status}`
  },
  canonical_redirect_consistency: {
    field: 'canonical',
    filter: (page) => {
      if (!page.canonical) return false;
      // Check if canonical doesn't match URL (simplified check)
      const canonicalPath = new URL(page.canonical).pathname;
      const urlPath = new URL(page.url).pathname;
      return canonicalPath !== urlPath && page.canonical !== page.url;
    },
    getIssue: (page) => `Canonical mismatch: ${page.canonical}`
  },
  heading_hierarchy_reasonable: {
    field: 'computed',
    filter: (page) => {
      if (!page.headings) return false;
      const headings = page.headings as Record<string, number>;
      // Issue if there are multiple H1s or H2 comes before H1
      const h1Count = headings['h1'] || 0;
      return h1Count > 1 || h1Count === 0;
    },
    getIssue: (page) => {
      const headings = page.headings as Record<string, number>;
      const h1Count = headings?.['h1'] || 0;
      if (h1Count === 0) return 'No H1 tag found';
      if (h1Count > 1) return `Multiple H1 tags (${h1Count})`;
      return 'Heading hierarchy issue';
    }
  },
  duplicate_titles_across_sample: {
    field: 'title',
    filter: () => false, // This is computed across pages, handled specially
    getIssue: () => 'Duplicate title'
  },
  large_images_detected: {
    field: 'computed',
    filter: (page) => {
      // Check if there are images without alt tags
      return page.image_count > 0 && page.images_with_alt < page.image_count;
    },
    getIssue: (page) => {
      const missing = page.image_count - page.images_with_alt;
      return `${missing} of ${page.image_count} images missing alt text`;
    }
  }
};

export function AffectedPagesList({ pages, checkKey, totalPages }: AffectedPagesListProps) {
  const filterConfig = CHECK_PAGE_FILTERS[checkKey];
  
  if (!filterConfig) {
    return null;
  }

  let affectedPages: Array<{ page: AuditPage; issue: string }>;

  // Special handling for duplicate titles
  if (checkKey === 'duplicate_titles_across_sample') {
    const titleCounts = new Map<string, AuditPage[]>();
    pages.forEach(page => {
      if (page.title) {
        const existing = titleCounts.get(page.title) || [];
        existing.push(page);
        titleCounts.set(page.title, existing);
      }
    });
    
    affectedPages = [];
    titleCounts.forEach((pagesWithTitle, title) => {
      if (pagesWithTitle.length > 1) {
        pagesWithTitle.forEach(page => {
          affectedPages.push({
            page,
            issue: `Duplicate title (${pagesWithTitle.length} pages): "${title.substring(0, 50)}..."`
          });
        });
      }
    });
  } else {
    affectedPages = pages
      .filter(filterConfig.filter)
      .map(page => ({
        page,
        issue: filterConfig.getIssue(page)
      }));
  }

  if (affectedPages.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 py-2">
        <CheckCircle className="w-4 h-4" />
        <span>All {totalPages} pages pass this check</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileWarning className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <span>Affected Pages</span>
        </div>
        <Badge variant="secondary" className="text-xs">
          {affectedPages.length} of {totalPages} pages
        </Badge>
      </div>
      
      <ScrollArea className={cn(
        "rounded-lg border bg-muted/30",
        affectedPages.length > 5 ? "h-[240px]" : ""
      )}>
        <div className="divide-y divide-border">
          {affectedPages.map(({ page, issue }) => (
            <div 
              key={page.id} 
              className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-1">
                <a 
                  href={page.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline truncate"
                >
                  {(() => {
                    try {
                      return new URL(page.url).pathname || '/';
                    } catch {
                      return page.url;
                    }
                  })()}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
                <p className="text-xs text-muted-foreground">
                  {issue}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
