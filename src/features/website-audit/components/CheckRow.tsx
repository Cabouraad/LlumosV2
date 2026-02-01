import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, XCircle, ChevronDown, ChevronUp, Zap, Clock } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AuditCheck, AuditPage } from '../types';
import { AffectedPagesList } from './AffectedPagesList';

interface CheckRowProps {
  check: AuditCheck;
  showModule?: boolean;
  pages?: AuditPage[];
}

const CHECK_LABELS: Record<string, string> = {
  https_enforced: 'HTTPS Enforced',
  robots_exists_and_allows: 'robots.txt Exists & Allows Crawling',
  sitemap_exists: 'XML Sitemap Present',
  homepage_status_200: 'Homepage Returns 200',
  canonical_redirect_consistency: 'Canonical/Redirect Consistency',
  noindex_not_present_on_homepage: 'No noindex on Homepage',
  title_present: 'Page Titles Present',
  meta_description_present: 'Meta Descriptions Present',
  h1_present: 'H1 Tags Present',
  heading_hierarchy_reasonable: 'Heading Hierarchy Valid',
  duplicate_titles_across_sample: 'No Duplicate Titles',
  thin_content_pages: 'No Thin Content Pages',
  organization_schema_present: 'Organization Schema',
  schema_has_sameAs: 'Schema sameAs Links',
  about_page_exists: 'About Page Exists',
  contact_page_exists: 'Contact Page Exists',
  policies_present: 'Privacy/Terms Pages',
  llms_txt_present: 'llms.txt File Present',
  llms_txt_has_canonical_sources: 'llms.txt Has Key URLs',
  pricing_or_plans_page_exists: 'Pricing Page Exists',
  faq_or_qna_page_exists: 'FAQ Page Exists',
  social_profiles_linked_from_site: 'Social Profile Links',
  brand_name_present_in_title_or_h1: 'Brand Name in Title/H1',
  large_images_detected: 'Image Optimization',
  render_blocking_assets_detected: 'Render-Blocking Assets',
  pagespeed_mobile: 'Mobile Page Speed',
  content_freshness: 'Content Freshness'
};

// Checks that can show affected pages
const PAGE_LEVEL_CHECKS = [
  'title_present',
  'meta_description_present',
  'h1_present',
  'heading_hierarchy_reasonable',
  'duplicate_titles_across_sample',
  'thin_content_pages',
  'organization_schema_present',
  'canonical_redirect_consistency',
  'large_images_detected'
];

export function CheckRow({ check, showModule = false, pages = [] }: CheckRowProps) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = {
    pass: <CheckCircle className="w-5 h-5 text-green-500" />,
    warn: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    fail: <XCircle className="w-5 h-5 text-red-500" />
  };

  const statusBg = {
    pass: 'bg-green-500/5 hover:bg-green-500/10',
    warn: 'bg-yellow-500/5 hover:bg-yellow-500/10',
    fail: 'bg-red-500/5 hover:bg-red-500/10'
  };

  const impactColors = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  const effortColors = {
    low: 'bg-green-100 text-green-700 border-green-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    high: 'bg-red-100 text-red-700 border-red-200'
  };

  const canShowAffectedPages = PAGE_LEVEL_CHECKS.includes(check.key) && pages.length > 0;

  return (
    <div className={cn('rounded-lg border', statusBg[check.status])}>
      <button
        className="w-full p-4 flex items-center gap-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {statusIcon[check.status]}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">
              {CHECK_LABELS[check.key] || check.key}
            </span>
            <Badge variant="outline" className="text-xs">
              Score: {check.score}
            </Badge>
            {check.impact && (
              <Badge className={cn('text-xs', impactColors[check.impact])}>
                <Zap className="w-3 h-3 mr-1" />
                {check.impact} impact
              </Badge>
            )}
            {check.effort && (
              <Badge className={cn('text-xs', effortColors[check.effort])}>
                <Clock className="w-3 h-3 mr-1" />
                {check.effort} effort
              </Badge>
            )}
          </div>
          {showModule && (
            <span className="text-xs text-muted-foreground capitalize mt-1 block">
              {check.module.replace('_', ' ')}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t pt-3">
          {check.why && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-1">Why it matters</h4>
              <p className="text-sm">{check.why}</p>
            </div>
          )}
          
          {/* Show affected pages for page-level checks */}
          {canShowAffectedPages && check.status !== 'pass' && (
            <AffectedPagesList 
              pages={pages} 
              checkKey={check.key} 
              totalPages={pages.length}
            />
          )}
          
          {/* Show raw evidence for non-page-level checks or as fallback */}
          {check.evidence && Object.keys(check.evidence).length > 0 && !canShowAffectedPages && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-1">Evidence</h4>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                {JSON.stringify(check.evidence, null, 2)}
              </pre>
            </div>
          )}
          
          {check.fix && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-1">How to fix</h4>
              <p className="text-sm">{check.fix}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
