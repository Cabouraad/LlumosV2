import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Search, Globe, Sparkles, Shield, Zap, TrendingUp } from 'lucide-react';
import { useProgressiveAudit } from '@/features/website-audit/hooks';
import { AuditProgress } from '@/features/website-audit/components/AuditProgress';
import { BUSINESS_TYPES } from '@/features/website-audit/types';
import { validateDomain } from '@/utils/domainValidation';
import { toast } from '@/hooks/use-toast';
import { MarketingLayout } from '@/components/landing/MarketingLayout';

export default function WebsiteAudit() {
  const navigate = useNavigate();
  const [domain, setDomain] = useState('');
  const [brandName, setBrandName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [crawlLimit, setCrawlLimit] = useState(100);
  const [allowSubdomains, setAllowSubdomains] = useState(false);

  const { runAudit, progress, phase, error, isRunning } = useProgressiveAudit();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateDomain(domain);
    if (!validation.isValid) {
      toast({
        title: 'Invalid Domain',
        description: validation.warning || 'Please enter a valid domain',
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await runAudit({
        domain: validation.cleanedDomain,
        brand_name: brandName || undefined,
        business_type: businessType || undefined,
        crawl_limit: crawlLimit,
        allow_subdomains: allowSubdomains
      });

      if (result.success) {
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
            Get a comprehensive analysis of your website's SEO health and AI readiness.
            Discover exactly what to fix to improve your visibility.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Form Card */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Run Your Free Audit</CardTitle>
              <CardDescription>
                We'll crawl up to {crawlLimit} pages and generate a detailed report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="domain">Website URL *</Label>
                  <Input
                    id="domain"
                    type="text"
                    placeholder="yourcompany.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brandName">Brand Name (optional)</Label>
                  <Input
                    id="brandName"
                    type="text"
                    placeholder="Your Company"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                  />
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
                      Crawl blog.example.com, shop.example.com, etc.
                    </p>
                  </div>
                  <Switch
                    id="subdomains"
                    checked={allowSubdomains}
                    onCheckedChange={setAllowSubdomains}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={!domain.trim() || isRunning}
                >
                  {isRunning ? 'Running Audit...' : 'Run Audit'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  No credit card required • Takes {crawlLimit > 100 ? '2-5' : '1-2'} minutes
                </p>
              </form>
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
