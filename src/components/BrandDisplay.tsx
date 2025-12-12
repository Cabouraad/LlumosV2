import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';

interface BrandDisplayProps {
  brandName: string;
  brandDomain?: string;
  collapsed?: boolean;
  size?: 'default' | 'large';
}

export function BrandDisplay({ brandName, brandDomain, collapsed = false, size = 'default' }: BrandDisplayProps) {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoError, setLogoError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Clean domain for logo fetching - remove www. and ensure just the base domain
  const getCleanDomain = (domain?: string, name?: string): string => {
    if (domain) {
      // Remove protocol if present
      let clean = domain.replace(/^https?:\/\//, '');
      // Remove www.
      clean = clean.replace(/^www\./, '');
      // Remove trailing slash and path
      clean = clean.split('/')[0];
      return clean;
    }
    // Fallback: construct from name
    if (name) {
      return `${name.toLowerCase().replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}.com`;
    }
    return '';
  };

  // Generate logo URLs using actual domain if available
  useEffect(() => {
    if (!brandName) return;
    
    const domain = getCleanDomain(brandDomain, brandName);
    const clearbitUrl = `https://logo.clearbit.com/${domain}`;
    setLogoUrl(clearbitUrl);
    setLogoError(false);
    setRetryCount(0);
  }, [brandName, brandDomain]);

  const handleLogoError = () => {
    if (retryCount < 2 && brandDomain) {
      // Try alternative domain formats
      const domain = getCleanDomain(brandDomain, brandName);
      setRetryCount(prev => prev + 1);
      
      if (retryCount === 0) {
        // Try Google favicon as fallback
        setLogoUrl(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
        return;
      }
    }
    
    if (!logoError) {
      setLogoError(true);
      // Final fallback to UI Avatars with brand colors
      const avatarSize = size === 'large' ? 64 : 40;
      setLogoUrl(`https://ui-avatars.com/api/?name=${encodeURIComponent(brandName)}&size=${avatarSize}&background=6366f1&color=ffffff&bold=true&format=svg`);
    }
  };

  if (collapsed) {
    return (
      <div className="flex justify-center p-2">
        <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center border border-border/30">
          {logoUrl && !logoError ? (
            <img
              src={logoUrl}
              alt={`${brandName} logo`}
              className="w-6 h-6 rounded object-contain"
              onError={handleLogoError}
            />
          ) : (
            <Building2 className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>
    );
  }

  // For large size (brand cards)
  if (size === 'large') {
    return (
      <div className="flex items-center gap-4">
        {/* Brand Logo */}
        <div className="w-16 h-16 rounded-lg bg-secondary/20 flex items-center justify-center border border-border/30 shadow-sm overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${brandName} logo`}
              className="w-12 h-12 object-contain"
              onError={handleLogoError}
            />
          ) : (
            <Building2 className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        
        {/* Brand Name */}
        <h2 className="text-2xl font-semibold text-foreground break-words leading-tight">
          {brandName}
        </h2>
      </div>
    );
  }

  // Default size (sidebar/header)
  return (
    <div className="px-6 py-4 border-b border-border/30 bg-card/30 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {/* Brand Logo */}
        <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center border border-border/30 shadow-sm overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${brandName} logo`}
              className="w-8 h-8 object-contain"
              onError={handleLogoError}
            />
          ) : (
            <Building2 className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        
        {/* Brand Name */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground break-words leading-tight">
            {brandName}
          </h2>
        </div>
      </div>
    </div>
  );
}