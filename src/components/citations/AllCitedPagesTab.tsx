import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Search, ArrowUpDown, Download, FileText } from 'lucide-react';

interface Citation {
  citation_url: string;
  citation_domain: string;
  citation_title: string;
  total_mentions: number;
  unique_prompts: number;
  providers: string[];
  is_own_domain?: boolean;
}

interface AllCitedPagesTabProps {
  ownedCitations: Citation[];
  competitorCitations: Citation[];
}

export function AllCitedPagesTab({ ownedCitations, competitorCitations }: AllCitedPagesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'citations' | 'domain'>('citations');
  const [filterType, setFilterType] = useState<'all' | 'owned' | 'competitor'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Combine and mark citations
  const allCitations = useMemo(() => {
    const owned = ownedCitations.map(c => ({ ...c, is_own_domain: true }));
    const competitor = competitorCitations.map(c => ({ ...c, is_own_domain: false }));
    return [...owned, ...competitor];
  }, [ownedCitations, competitorCitations]);

  // Filter and sort
  const processedCitations = useMemo(() => {
    let filtered = allCitations;
    
    // Apply type filter
    if (filterType === 'owned') {
      filtered = filtered.filter(c => c.is_own_domain);
    } else if (filterType === 'competitor') {
      filtered = filtered.filter(c => !c.is_own_domain);
    }
    
    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.citation_url.toLowerCase().includes(query) ||
        c.citation_domain.toLowerCase().includes(query)
      );
    }
    
    // Apply sort
    if (sortBy === 'citations') {
      filtered.sort((a, b) => b.total_mentions - a.total_mentions);
    } else {
      filtered.sort((a, b) => a.citation_domain.localeCompare(b.citation_domain));
    }
    
    return filtered;
  }, [allCitations, searchQuery, sortBy, filterType]);

  // Pagination
  const totalPages = Math.ceil(processedCitations.length / pageSize);
  const paginatedCitations = processedCitations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Get display path from URL
  const getDisplayPath = (url: string) => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname + urlObj.search;
      return path.length > 60 ? path.substring(0, 57) + '...' : path;
    } catch {
      return url.length > 60 ? url.substring(0, 57) + '...' : url;
    }
  };

  // Export to CSV
  const handleExport = () => {
    const headers = ['URL', 'Domain', 'Citations', 'Type'];
    const rows = processedCitations.map(c => [
      c.citation_url,
      c.citation_domain,
      c.total_mentions.toString(),
      c.is_own_domain ? 'Your Content' : 'Competitor'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'all-cited-pages.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              All Cited Pages
            </CardTitle>
            <CardDescription>
              Complete list of {allCitations.length} pages cited by AI models
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by URL or domain..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => { setFilterType(v as any); setCurrentPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pages</SelectItem>
              <SelectItem value="owned">Your Pages</SelectItem>
              <SelectItem value="competitor">Competitors</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[160px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="citations">Most Citations</SelectItem>
              <SelectItem value="domain">By Domain</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          Showing {paginatedCitations.length} of {processedCitations.length} pages
        </p>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">#</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Page URL</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Domain</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Citations</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedCitations.map((citation, idx) => (
                <tr key={citation.citation_url} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-sm text-muted-foreground">
                    {(currentPage - 1) * pageSize + idx + 1}
                  </td>
                  <td className="p-3">
                    <a
                      href={citation.citation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:text-primary flex items-center gap-1.5 group"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary" />
                      <span className="truncate max-w-[300px]" title={citation.citation_url}>
                        {getDisplayPath(citation.citation_url)}
                      </span>
                    </a>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {citation.citation_domain}
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary">{citation.total_mentions}</Badge>
                  </td>
                  <td className="p-3">
                    <Badge 
                      variant={citation.is_own_domain ? "default" : "outline"}
                      className={citation.is_own_domain ? "bg-primary/10 text-primary border-primary/30" : ""}
                    >
                      {citation.is_own_domain ? 'Yours' : 'Competitor'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

        {paginatedCitations.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No citations match your filters
          </div>
        )}
      </CardContent>
    </Card>
  );
}
