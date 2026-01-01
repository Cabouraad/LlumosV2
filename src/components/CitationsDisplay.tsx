import React from 'react';
import { ExternalLink, FileText, Video, File, CheckCircle, Clock, XCircle, AlertTriangle, Users, ShieldCheck, ShieldAlert, ShieldQuestion, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface Citation {
  url: string;
  domain: string;
  title?: string;
  source_type: 'page' | 'pdf' | 'video' | 'unknown';
  from_provider: boolean;
  brand_mention: 'unknown' | 'yes' | 'no';
  brand_mention_confidence: number;
  resolved_brand?: {
    brand: string;
    canonicalDomain: string;
    type: 'known' | 'heuristic' | 'unknown';
  };
  is_competitor?: boolean;
  // Quality indicators from validation
  is_accessible?: boolean;
  validation_status_code?: number;
  validated_at?: string;
  validation_error?: string;
}

interface CitationsDisplayProps {
  citations?: Citation[];
  provider: string;
  isCompact?: boolean;
  showQualityIndicators?: boolean;
}

export function CitationsDisplay({ citations, provider, isCompact = false, showQualityIndicators = true }: CitationsDisplayProps) {
  if (!citations || citations.length === 0) {
    // Show provider-specific messaging for OpenAI
    if (provider.toLowerCase() === 'openai') {
      return (
        <div className="text-sm text-muted-foreground italic">
          OpenAI does not provide native citation support
        </div>
      );
    }
    
    return (
      <div className="text-sm text-muted-foreground italic">
        No provider citations available
      </div>
    );
  }

  const visibleCitations = isCompact ? citations.slice(0, 10) : citations;
  const remainingCount = isCompact ? Math.max(0, citations.length - 10) : 0;
  
  // Calculate quality stats
  const validatedCount = citations.filter(c => c.validated_at).length;
  const accessibleCount = citations.filter(c => c.is_accessible === true).length;
  const hasValidation = validatedCount > 0;

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ExternalLink className="h-4 w-4" />
          <span>Sources ({citations.length})</span>
          {showQualityIndicators && hasValidation && (
            <CitationQualitySummary 
              total={citations.length}
              validated={validatedCount}
              accessible={accessibleCount}
            />
          )}
        </div>
        
        <div className={`flex flex-wrap gap-2 ${isCompact ? 'max-h-20 overflow-hidden' : ''}`}>
          {visibleCitations.map((citation, index) => (
            <CitationChip key={index} citation={citation} showQuality={showQualityIndicators} />
          ))}
          
          {remainingCount > 0 && (
            <Badge variant="secondary" className="cursor-pointer">
              +{remainingCount} more
            </Badge>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function CitationQualitySummary({ total, validated, accessible }: { total: number; validated: number; accessible: number }) {
  const qualityScore = validated > 0 ? Math.round((accessible / validated) * 100) : null;
  
  if (qualityScore === null) return null;
  
  const getQualityColor = () => {
    if (qualityScore >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (qualityScore >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };
  
  const getQualityIcon = () => {
    if (qualityScore >= 80) return <ShieldCheck className="h-3 w-3" />;
    if (qualityScore >= 50) return <ShieldQuestion className="h-3 w-3" />;
    return <ShieldAlert className="h-3 w-3" />;
  };
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={`text-xs ${getQualityColor()}`}>
          {getQualityIcon()}
          <span className="ml-1">{qualityScore}% verified</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <p><strong>Citation Quality Score</strong></p>
          <p>{accessible} of {validated} validated links are accessible</p>
          <p className="text-muted-foreground">Higher scores indicate more reliable sources</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function CitationChip({ citation, showQuality = true }: { citation: Citation; showQuality?: boolean }) {
  const getSourceIcon = () => {
    switch (citation.source_type) {
      case 'pdf':
        return <FileText className="h-3 w-3" />;
      case 'video':
        return <Video className="h-3 w-3" />;
      default:
        return <File className="h-3 w-3" />;
    }
  };

  const getSourceTypeBadge = () => {
    const domain = citation.domain?.toLowerCase() || '';
    const socialDomains = ['twitter.com', 'facebook.com', 'linkedin.com', 'instagram.com', 'youtube.com', 'reddit.com', 'tiktok.com', 'pinterest.com'];
    const isSocial = socialDomains.some(social => domain.includes(social));
    
    if (isSocial) {
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
          <Users className="h-3 w-3 mr-1" />
          Social
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
        <FileText className="h-3 w-3 mr-1" />
        Content
      </Badge>
    );
  };

  const getBrandMentionBadge = () => {
    switch (citation.brand_mention) {
      case 'yes':
        return (
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
            <CheckCircle className="h-3 w-3 mr-1" />
            Mentions brand
          </Badge>
        );
      case 'no':
        return (
          <Badge variant="outline" className="text-gray-500">
            <XCircle className="h-3 w-3 mr-1" />
            No brand mention
          </Badge>
        );
      case 'unknown':
      default:
        return getSourceTypeBadge();
    }
  };

  const getQualityIndicator = () => {
    if (!showQuality || citation.validated_at === undefined) {
      return null; // Not validated yet
    }
    
    if (citation.is_accessible === true) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <Link2 className="h-3 w-3 text-green-500" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Link verified accessible</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    
    if (citation.is_accessible === false) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              <XCircle className="h-3 w-3 text-orange-400" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Link may be inaccessible</p>
            {citation.validation_error && (
              <p className="text-xs text-muted-foreground">{citation.validation_error}</p>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }
    
    return null;
  };

  const getDisplayName = () => {
    if (citation.resolved_brand) {
      const name = citation.resolved_brand.brand;
      // Add ~ marker for heuristic mappings
      return citation.resolved_brand.type === 'heuristic' ? `~${name}` : name;
    }
    return citation.domain;
  };

  // Visual styling based on validation status
  const getCardClasses = () => {
    const base = 'p-2 cursor-pointer hover:bg-muted/50 transition-colors max-w-xs';
    
    if (citation.is_competitor) {
      return `${base} border-red-200 bg-red-50/30`;
    }
    
    if (showQuality && citation.validated_at) {
      if (citation.is_accessible === true) {
        return `${base} border-green-200/50`;
      }
      if (citation.is_accessible === false) {
        return `${base} border-orange-200/50 opacity-75`;
      }
    }
    
    return base;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Card 
          className={getCardClasses()}
          onClick={() => window.open(citation.url, '_blank', 'noopener,noreferrer')}
        >
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              {getSourceIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <div className="font-medium text-sm truncate">
                  {getDisplayName()}
                </div>
                {getQualityIndicator()}
                {citation.is_competitor && (
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertTriangle className="h-3 w-3 text-red-500 flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Competitor source</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {citation.title && !/^Source \d+$/.test(citation.title) && (
                <div className="text-xs text-muted-foreground truncate">
                  {citation.title}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                {getBrandMentionBadge()}
                {!citation.from_provider && (
                  <Badge variant="outline" className="text-xs">
                    Discovered
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-sm">
        <div className="space-y-1">
          <div className="font-medium">{citation.title || getDisplayName()}</div>
          <div className="text-xs text-muted-foreground">
            Domain: {citation.domain}
          </div>
          <div className="text-xs text-muted-foreground break-all">
            {citation.url}
          </div>
          {citation.resolved_brand && (
            <div className="text-xs">
              Brand: {citation.resolved_brand.brand} 
              {citation.resolved_brand.type !== 'known' && (
                <span className="text-muted-foreground"> ({citation.resolved_brand.type})</span>
              )}
            </div>
          )}
          {citation.is_competitor && (
            <div className="text-xs text-red-600">
              ⚠ Competitor source
            </div>
          )}
          {citation.brand_mention !== 'unknown' && (
            <div className="text-xs">
              Brand mention confidence: {Math.round(citation.brand_mention_confidence * 100)}%
            </div>
          )}
          {showQuality && citation.validated_at && (
            <div className="text-xs border-t pt-1 mt-1">
              <span className={citation.is_accessible ? 'text-green-600' : 'text-orange-500'}>
                {citation.is_accessible ? '✓ Link verified' : '⚠ Link may be broken'}
              </span>
              {citation.validation_status_code && citation.validation_status_code > 0 && (
                <span className="text-muted-foreground ml-1">
                  (HTTP {citation.validation_status_code})
                </span>
              )}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}