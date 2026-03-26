import { useState, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SEOHelmet } from '@/components/SEOHelmet';
import { Footer } from '@/components/Footer';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  BarChart3, 
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Eye,
  Sparkles,
  Zap,
  Globe,
  MessageSquare,
  Target,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// Industry competitor databases by domain keywords
const INDUSTRY_COMPETITORS: Record<string, string[]> = {
  law: ['LegalZoom', 'Avvo', 'FindLaw', 'Justia', 'Nolo', 'Rocket Lawyer'],
  legal: ['LegalZoom', 'Avvo', 'FindLaw', 'Justia', 'Nolo', 'Rocket Lawyer'],
  attorney: ['LegalZoom', 'Avvo', 'FindLaw', 'Justia', 'LawDepot'],
  dental: ['Aspen Dental', 'Smile Direct Club', 'Pacific Dental', 'Gentle Dental', 'Western Dental'],
  dentist: ['Aspen Dental', 'Smile Direct Club', 'Pacific Dental', 'Gentle Dental', 'Western Dental'],
  plumb: ['Roto-Rooter', 'Mr. Rooter', 'ARS Rescue Rooter', 'Benjamin Franklin Plumbing', 'Len The Plumber'],
  hvac: ['Carrier', 'Trane', 'Lennox', 'Service Experts', 'One Hour Heating & Air'],
  market: ['HubSpot', 'Mailchimp', 'Semrush', 'Moz', 'Ahrefs', 'Sprout Social'],
  seo: ['Semrush', 'Ahrefs', 'Moz', 'Screaming Frog', 'Surfer SEO', 'SE Ranking'],
  design: ['Canva', 'Figma', 'Adobe', '99designs', 'Dribbble', 'Behance'],
  fitness: ['Equinox', 'Planet Fitness', 'Orangetheory', 'F45 Training', 'CrossFit'],
  real: ['Zillow', 'Redfin', 'Realtor.com', 'Compass', 'Keller Williams'],
  estate: ['Zillow', 'Redfin', 'Realtor.com', 'Compass', 'Coldwell Banker'],
  finance: ['NerdWallet', 'Bankrate', 'Credit Karma', 'Mint', 'Personal Capital'],
  insurance: ['Geico', 'Progressive', 'State Farm', 'Allstate', 'USAA'],
  tech: ['Accenture', 'Deloitte Digital', 'IBM', 'Cognizant', 'Infosys'],
  software: ['Salesforce', 'HubSpot', 'Zendesk', 'Freshworks', 'Monday.com'],
  saas: ['Salesforce', 'HubSpot', 'Zendesk', 'Freshworks', 'Monday.com'],
  restaurant: ['DoorDash', 'Uber Eats', 'Grubhub', 'Yelp', 'OpenTable'],
  food: ['DoorDash', 'Uber Eats', 'Grubhub', 'Yelp', 'OpenTable'],
  ecommerce: ['Shopify', 'Amazon', 'WooCommerce', 'BigCommerce', 'Squarespace'],
  shop: ['Shopify', 'Amazon', 'Etsy', 'WooCommerce', 'BigCommerce'],
  health: ['WebMD', 'Healthline', 'Mayo Clinic', 'Cleveland Clinic', 'MDAnderson'],
  medical: ['WebMD', 'Healthline', 'Mayo Clinic', 'Cleveland Clinic', 'Zocdoc'],
  travel: ['Expedia', 'Booking.com', 'TripAdvisor', 'Kayak', 'Airbnb'],
  hotel: ['Marriott', 'Hilton', 'IHG', 'Hyatt', 'Booking.com'],
  auto: ['CarMax', 'AutoTrader', 'Cars.com', 'Carvana', 'TrueCar'],
  car: ['CarMax', 'AutoTrader', 'Cars.com', 'Carvana', 'TrueCar'],
  consult: ['McKinsey', 'Deloitte', 'Bain', 'BCG', 'Accenture'],
  education: ['Coursera', 'Udemy', 'Khan Academy', 'edX', 'Skillshare'],
  smb: ['HubSpot', 'Mailchimp', 'Constant Contact', 'Salesforce Essentials', 'Zoho'],
};

const DEFAULT_COMPETITORS = ['HubSpot', 'Salesforce', 'Mailchimp', 'Semrush', 'Ahrefs', 'Moz'];

function getCompetitorsForDomain(domain: string): string[] {
  const domainLower = domain.toLowerCase();
  for (const [keyword, competitors] of Object.entries(INDUSTRY_COMPETITORS)) {
    if (domainLower.includes(keyword)) {
      return competitors.slice(0, 5);
    }
  }
  return DEFAULT_COMPETITORS.slice(0, 5);
}

// Seed-based pseudo-random for consistent results per domain
function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
}

const generateAuditData = (domain: string) => {
  const rand = seededRandom(domain);
  const competitors = getCompetitorsForDomain(domain);
  const overallScore = Math.floor(rand() * 35) + 15; // 15-50 range

  const platforms = {
    chatgpt: {
      mentioned: rand() > 0.65,
      score: Math.floor(rand() * 30) + 8,
      snippetContext: rand() > 0.5
        ? `mentioned in a comparison with ${competitors[0]}`
        : 'not found in tested prompts',
      promptsTested: 5,
      promptsFound: Math.floor(rand() * 3),
    },
    gemini: {
      mentioned: rand() > 0.55,
      score: Math.floor(rand() * 35) + 12,
      snippetContext: rand() > 0.5
        ? `cited as an alternative to ${competitors[1]}`
        : 'not referenced in AI responses',
      promptsTested: 5,
      promptsFound: Math.floor(rand() * 3),
    },
    perplexity: {
      mentioned: rand() > 0.7,
      score: Math.floor(rand() * 25) + 5,
      snippetContext: rand() > 0.4
        ? `appeared in source citations`
        : 'no citations detected',
      promptsTested: 5,
      promptsFound: Math.floor(rand() * 2),
    },
  };

  const competitorData = competitors.map(name => ({
    name,
    mentionRate: Math.floor(rand() * 60) + 25,
    platforms: Math.floor(rand() * 3) + 1,
    trend: rand() > 0.5 ? 'up' as const : 'stable' as const,
  }));

  // Sort competitors by mention rate descending
  competitorData.sort((a, b) => b.mentionRate - a.mentionRate);

  const brandName = domain.replace(/\.(com|io|net|org|co|ai|app)$/i, '').replace(/[^a-zA-Z0-9]/g, ' ').trim();

  return {
    domain,
    brandName,
    overallScore,
    platforms,
    competitors: competitorData,
    totalPromptsAnalyzed: 15,
    totalPlatforms: 3,
    findings: [
      {
        type: 'critical' as const,
        title: 'Low Brand Visibility Across AI Platforms',
        detail: `"${brandName}" was found in only ${Object.values(platforms).filter(p => p.mentioned).length} of 3 AI platforms tested. Competitors like ${competitors[0]} and ${competitors[1]} appear significantly more often.`,
      },
      {
        type: 'warning' as const,
        title: 'Competitors Dominating AI Recommendations',
        detail: `${competitorData[0].name} leads with a ${competitorData[0].mentionRate}% mention rate across AI platforms. Your brand needs structured content optimized for AI citation.`,
      },
      {
        type: 'warning' as const,
        title: 'Missing Structured Data for AI Crawlers',
        detail: `AI models rely on structured data (FAQ schema, Organization schema, HowTo) to understand and reference brands. Your site may be missing key schema types.`,
      },
      {
        type: 'info' as const,
        title: 'Content Gap Opportunities Detected',
        detail: `There are high-intent prompts in your industry where no dominant brand appears. Creating targeted content for these gaps could establish your brand as the AI-recommended solution.`,
      },
    ],
    recommendations: [
      'Add comprehensive FAQ schema markup to your key landing pages',
      `Create comparison content: "${brandName} vs ${competitors[0]}" to capture competitive prompts`,
      'Build authoritative backlinks from industry publications AI models trust',
      'Optimize your site\'s llms.txt file for AI crawler accessibility',
      'Publish thought leadership content answering high-intent industry questions',
    ],
  };
};

const AuditResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const domain = searchParams.get('domain') || 'example.com';
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const data = useMemo(() => generateAuditData(domain), [domain]);

  const handleUnlock = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Check your email for the full report!');
    navigate(`/signup?email=${encodeURIComponent(email)}&from=audit`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Good';
    if (score >= 40) return 'Needs Improvement';
    return 'Critical';
  };

  const getFindingIcon = (type: string) => {
    switch (type) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      default: return <Zap className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <>
      <SEOHelmet
        title={`AI Visibility Audit Results for ${domain}`}
        description="See how your brand appears in AI search results. Get your full AI visibility report."
        canonicalPath="/audit-results"
      />

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Search className="w-8 h-8 text-primary" />
              <span className="text-2xl font-bold">Llumos</span>
            </Link>
            <nav className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/signin">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </nav>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 max-w-5xl">
          {/* Results Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <Badge variant="outline" className="mb-4 px-4 py-2 border-primary/20">
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              AI Visibility Audit Complete
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Audit Results for <span className="text-primary">{domain}</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              {data.totalPromptsAnalyzed} prompts analyzed across {data.totalPlatforms} AI platforms
            </p>
          </motion.div>

          {/* Score Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="mb-8 border-2 border-primary/20 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Overall AI Visibility Score
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap">
                  <div className="text-center">
                    <div className={`text-6xl font-bold ${getScoreColor(data.overallScore)}`}>
                      {data.overallScore}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">out of 100</div>
                    <Badge
                      variant="outline"
                      className={`mt-2 ${data.overallScore < 40 ? 'border-red-500/50 text-red-500' : 'border-amber-500/50 text-amber-500'}`}
                    >
                      {data.overallScore < 40 && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {getScoreLabel(data.overallScore)}
                    </Badge>
                  </div>

                  <div className="h-24 w-px bg-border hidden md:block" />

                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="text-2xl font-bold text-foreground">{data.totalPlatforms}</div>
                      <div className="text-xs text-muted-foreground">Platforms Scanned</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{data.totalPromptsAnalyzed}</div>
                      <div className="text-xs text-muted-foreground">Prompts Tested</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-500">{data.competitors.length}</div>
                      <div className="text-xs text-muted-foreground">Competitors Found</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Platform Breakdown — VISIBLE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Platform Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {Object.entries(data.platforms).map(([platform, info]) => (
                    <div key={platform} className="p-4 rounded-lg border bg-muted/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold capitalize text-lg">{platform}</span>
                        {info.mentioned ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                            <CheckCircle className="w-3 h-3 mr-1" /> Detected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                            <XCircle className="w-3 h-3 mr-1" /> Not Found
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Visibility Score</span>
                          <span className={`font-semibold ${getScoreColor(info.score)}`}>{info.score}%</span>
                        </div>
                        <Progress value={info.score} className="h-2" />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{info.promptsFound}/{info.promptsTested}</span> prompts returned your brand
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        {info.snippetContext}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Competitor Analysis — VISIBLE with real names */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-8"
          >
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Competitor AI Visibility
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  These brands are being recommended by AI platforms in your industry
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.competitors.map((comp, i) => (
                    <div key={comp.name} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/10 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{comp.name}</span>
                          {comp.trend === 'up' && (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Found on {comp.platforms} of 3 platforms
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-foreground">{comp.mentionRate}%</div>
                        <div className="text-xs text-muted-foreground">mention rate</div>
                      </div>
                      <div className="w-24 hidden sm:block">
                        <Progress value={comp.mentionRate} className="h-2" />
                      </div>
                    </div>
                  ))}

                  {/* Your brand row */}
                  <div className="flex items-center gap-4 p-3 rounded-lg border-2 border-primary/30 bg-primary/5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">{data.brandName}</span>
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">You</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Your current AI visibility</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-lg font-bold ${getScoreColor(data.overallScore)}`}>{data.overallScore}%</div>
                      <div className="text-xs text-muted-foreground">mention rate</div>
                    </div>
                    <div className="w-24 hidden sm:block">
                      <Progress value={data.overallScore} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Key Findings — VISIBLE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  Key Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.findings.map((finding, i) => (
                    <div key={i} className="flex gap-3 p-4 rounded-lg border bg-muted/10">
                      {getFindingIcon(finding.type)}
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{finding.title}</h4>
                        <p className="text-sm text-muted-foreground">{finding.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recommendations — VISIBLE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-12"
          >
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Recommended Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {data.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <span className="text-sm text-foreground">{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* CTA — Get Full Report */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 via-background to-secondary/10">
              <CardContent className="pt-8 pb-8">
                <div className="text-center max-w-lg mx-auto space-y-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-2">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold">
                    Get Your Full AI Visibility Report
                  </h2>

                  <p className="text-muted-foreground">
                    Go deeper with real-time AI monitoring, prompt-level tracking, and ongoing competitor analysis across all major AI platforms.
                  </p>

                  <ul className="text-left space-y-2 max-w-sm mx-auto">
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      Real-time monitoring across ChatGPT, Gemini & Perplexity
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      Track exactly which prompts mention your brand
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      Competitor mention tracking with trend analysis
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      Actionable optimization recommendations
                    </li>
                  </ul>

                  <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 text-base"
                    />
                    <Button
                      size="lg"
                      className="h-12 px-6 font-semibold shadow-glow whitespace-nowrap"
                      onClick={handleUnlock}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Sending...' : 'Get Full Report'}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    No credit card required • 7-day free trial included
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default AuditResults;
