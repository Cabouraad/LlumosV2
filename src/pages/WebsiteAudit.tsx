import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Globe, Sparkles, Shield, Zap, TrendingUp, RefreshCw, ExternalLink, Clock, CheckCircle2 } from 'lucide-react';
import { useProgressiveAudit, useDomainAudit } from '@/features/website-audit/hooks';
import { AuditProgress } from '@/features/website-audit/components/AuditProgress';
import { BUSINESS_TYPES } from '@/features/website-audit/types';
import { toast } from '@/hooks/use-toast';
import { MarketingLayout } from '@/components/landing/MarketingLayout';
import { useBrand } from '@/contexts/BrandContext';
import { useAuth } from '@/contexts/AuthContext';
import { ScoreGauge } from '@/features/website-audit/components/ScoreGauge';
import { format } from 'date-fns';

export default function WebsiteAudit() {
  const navigate = useNavigate();
  const { selectedBrand, isValidated } = useBrand();
  const { user } = useAuth();
  
  const domain = selectedBrand?.domain || '';
  const brandName = selectedBrand?.name || '';
  
  const [businessType, setBusinessType] = useState('');
  const [crawlLimit, setCrawlLimit] = useState(100);
  const [allowSubdomains, setAllowSubdomains] = useState(false);

  const { runAudit, progress, phase, error, isRunning } = useProgressiveAudit();
  const { data: existingAudit, isLoading: auditLoading, refetch: refetchAudit } = useDomainAudit(domain);

  const handleRunAudit = async () => {
    if (!domain) {
      toast({
        title: 'No Domain',
        description: 'Please set up your brand with a domain first.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await runAudit({
        domain: domain,
        brand_name: brandName || undefined,
        business_type: businessType || undefined,
        crawl_limit: crawlLimit,
        allow_subdomains: allowSubdomains,
        user_id: user?.id
      });

      if (result.success) {
        refetchAudit();
        navigate(`/audit/results/${result.audit_id}`);
      }
    } catch (err) {
      console.error('Audit failed:', err);
      toast({
        title: 'Audit Failed',
        description: error || 'Unable to complete the audit. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const features = [
    {
      icon: Search,
      title: 'SEO Analysis',
      description: 'Crawl/index, on-page SEO, and content quality checks'
    },
    {
      icon: Globe,
      title: 'GEO Signals',
      description: 'Entity recognition, schema markup, and trust factors'
    },
    {
      icon: Sparkles,
      title: 'AI Readiness',
      description: 'llms.txt, FAQ pages, and LLM optimization'
    },
    {
      icon: Shield,
      title: 'Trust & Authority',
      description: 'Social profiles, policies, and brand signals'
    },
    {
      icon: Zap,
      title: 'Performance',
      description: 'Page speed, image optimization, and Core Web Vitals'
    },
    {
      icon: TrendingUp,
      title: 'Prioritized Fixes',
      description: 'Actionable recommendations sorted by impact'
    }
  ];

  // Show loading while brand context is initializing
  if (!isValidated) {
    return (
      <MarketingLayout>
        <div className="container py-16 text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </MarketingLayout>
    );
  }

  // User not logged in or no brand
  if (!user || !selectedBrand) {
    return (
      <MarketingLayout>
        <div className="container py-16 max-w-2xl">
          <Card className="text-center p-8">
            <h1 className="text-2xl font-bold mb-4">Website Audit</h1>
            <p className="text-muted-foreground mb-6">
              Sign in to run a comprehensive SEO and AI readiness audit on your website.
            </p>
            <Button asChild>
              <Link to="/signin">Sign In to Get Started</Link>
            </Button>
          </Card>
        </div>
      </MarketingLayout>
    );
  }

  if (isRunning) {
    return (
      <MarketingLayout>
        <div className="container py-16">
          <AuditProgress 
            domain={domain} 
            phase={phase} 
            progress={progress} 
          />
        </div>
      </MarketingLayout>
    );
  }

  // Show existing audit results with option to re-run
  if (existingAudit && !auditLoading) {
    return (
      <MarketingLayout>
        <div className="container py-16 max-w-5xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Website Audit
              <span className="text-primary"> Results</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Your latest audit for <span className="font-semibold">{domain}</span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Existing Audit Summary */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      Latest Audit
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Clock className="w-4 h-4" />
                      {format(new Date(existingAudit.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                    </CardDescription>
                  </div>
                  <ScoreGauge score={existingAudit.overall_score || 0} size="sm" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Module Scores Preview */}
                {existingAudit.module_scores && (
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(existingAudit.module_scores).slice(0, 6).map(([module, score]) => (
                      <div key={module} className="text-center p-2 bg-muted/50 rounded">
                        <div className={`text-lg font-bold ${
                          score >= 80 ? 'text-green-600' :
                          score >= 60 ? 'text-yellow-600' :
                          score >= 40 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {score}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {module.replace(/_/g, ' ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button asChild className="flex-1">
                    <Link to={`/audit/results/${existingAudit.id}`}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Full Report
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Re-run Card */}
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  Run New Audit
                </CardTitle>
                <CardDescription>
                  Re-crawl your site to get updated results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type (optional)</Label>
                  <Select value={businessType} onValueChange={setBusinessType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Pages to Crawl</Label>
                    <span className="text-sm font-medium">{crawlLimit}</span>
                  </div>
                  <Slider
                    value={[crawlLimit]}
                    onValueChange={(v) => setCrawlLimit(v[0])}
                    min={25}
                    max={500}
                    step={25}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="subdomains">Include Subdomains</Label>
                    <p className="text-xs text-muted-foreground">
                      Crawl blog.{domain}, shop.{domain}, etc.
                    </p>
                  </div>
                  <Switch
                    id="subdomains"
                    checked={allowSubdomains}
                    onCheckedChange={setAllowSubdomains}
                  />
                </div>

                <Button
                  onClick={handleRunAudit}
                  size="lg"
                  variant="outline"
                  className="w-full"
                  disabled={isRunning}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Re-run Audit
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Takes {crawlLimit > 100 ? '2-5' : '1-2'} minutes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Features Grid */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-center mb-8">What We Analyze</h2>
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
              {features.map((feature) => (
                <Card key={feature.title} className="p-4 text-center">
                  <feature.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                  <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  // No existing audit - show form to run first audit
  return (
    <MarketingLayout>
      <div className="container py-16 max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Website Audit
            <span className="text-primary"> (SEO + GEO)</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get a comprehensive analysis of <span className="font-semibold">{domain}</span>'s
            SEO health and AI readiness.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Form Card */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Run Your Audit</CardTitle>
              <CardDescription>
                We'll crawl up to {crawlLimit} pages of {domain} and generate a detailed report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground">Domain</Label>
                  <p className="font-medium">{domain}</p>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground">Brand</Label>
                  <p className="font-medium">{brandName}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type (optional)</Label>
                  <Select value={businessType} onValueChange={setBusinessType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Pages to Crawl</Label>
                    <span className="text-sm font-medium">{crawlLimit}</span>
                  </div>
                  <Slider
                    value={[crawlLimit]}
                    onValueChange={(v) => setCrawlLimit(v[0])}
                    min={25}
                    max={500}
                    step={25}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    More pages = more thorough analysis, but takes longer
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="subdomains">Include Subdomains</Label>
                    <p className="text-xs text-muted-foreground">
                      Crawl blog.{domain}, shop.{domain}, etc.
                    </p>
                  </div>
                  <Switch
                    id="subdomains"
                    checked={allowSubdomains}
                    onCheckedChange={setAllowSubdomains}
                  />
                </div>

                <Button
                  onClick={handleRunAudit}
                  size="lg"
                  className="w-full"
                  disabled={isRunning}
                >
                  {isRunning ? 'Running Audit...' : 'Run Audit'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Takes {crawlLimit > 100 ? '2-5' : '1-2'} minutes
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature) => (
              <Card key={feature.title} className="p-4">
                <feature.icon className="w-8 h-8 text-primary mb-2" />
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* What We Check Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">What We Analyze</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-3">Crawl & Indexability</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• HTTPS enforcement</li>
                <li>• robots.txt configuration</li>
                <li>• XML sitemap presence</li>
                <li>• Canonical URL consistency</li>
                <li>• Homepage accessibility</li>
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-3">On-Page SEO</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Title tags & meta descriptions</li>
                <li>• Heading hierarchy (H1-H6)</li>
                <li>• Duplicate content detection</li>
                <li>• Thin content pages</li>
                <li>• Image alt text coverage</li>
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-3">AI & Entity Signals</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• llms.txt file presence</li>
                <li>• Organization schema markup</li>
                <li>• FAQ page & schema</li>
                <li>• Social profile links</li>
                <li>• Trust pages (About, Contact)</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
