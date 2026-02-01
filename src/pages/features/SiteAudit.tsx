import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Search, 
  ArrowRight,
  Globe,
  Zap,
  FileSearch,
  Brain,
  Link2,
  BarChart3,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Target
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { RelatedFeatures } from '@/components/seo/RelatedFeatures';

const SiteAudit = () => {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>AI-Powered Site Audit - Technical SEO for AI Search Visibility | Llumos</title>
        <meta name="description" content="Comprehensive website audit optimized for AI search engines. Analyze crawlability, performance, on-page SEO, entity optimization, and AI readiness to improve your GEO." />
        <meta property="og:title" content="AI-Powered Site Audit - Technical SEO for AI Search Visibility" />
        <meta property="og:description" content="6-module technical audit framework designed for Generative Engine Optimization (GEO). Improve how AI models understand and recommend your website." />
        <meta property="og:image" content="https://llumos.app/og-home.png" />
        <link rel="canonical" href="https://llumos.app/features/site-audit" />
      </Helmet>

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Search className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">Llumos</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Home</Link>
            <Link to="/features" className="text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Button variant="outline" asChild>
              <Link to="/signin">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Breadcrumb */}
      <Breadcrumb 
        className="container mx-auto max-w-6xl" 
        items={[
          { name: 'Home', path: '/' },
          { name: 'Features', path: '/features' },
          { name: 'Site Audit', path: '/features/site-audit' }
        ]}
      />

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
                <Brain className="w-4 h-4" />
                AI-Optimized Technical Audit
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                Site Audit for AI Search Visibility
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Go beyond traditional SEO. Our 6-module audit framework analyzes your website's readiness for AI search engines like ChatGPT, Perplexity, and Gemini—helping you get recommended, not just ranked.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="text-lg px-8 py-6">
                  <a href="https://llumos.app/lp/ai-visibility" target="_blank" rel="noopener noreferrer">Get Your AI Visibility Score <ArrowRight className="ml-2 w-5 h-5" /></a>
                </Button>
                <Button variant="outline" size="lg" asChild className="text-lg px-8 py-6">
              <a href="https://calendly.com/llumos-info/llumos-demo" target="_blank" rel="noopener noreferrer">
                Book a Demo
              </a>
                </Button>
              </div>
            </div>
            <div>
              {/* Loom Video Embed */}
              <div className="relative rounded-lg overflow-hidden shadow-2xl border border-border/50">
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                  <iframe 
                    src="https://www.loom.com/embed/86a3071402494d0ebae210430cbe0741?sid=auto" 
                    frameBorder="0" 
                    allowFullScreen
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    title="Llumos Site Audit Walkthrough"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-4">
                Watch: See how Site Audit works in under 3 minutes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Site Audit Matters */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Why Traditional SEO Isn't Enough Anymore
            </h2>
            <p className="text-xl text-muted-foreground">
              AI search engines don't just look at keywords—they need to understand your entire website
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-6 border-destructive/30 bg-destructive/5">
              <AlertTriangle className="w-10 h-10 text-destructive mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">The Problem</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-destructive rounded-full mt-2 flex-shrink-0"></div>
                  <span>AI models struggle to understand poorly structured websites</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-destructive rounded-full mt-2 flex-shrink-0"></div>
                  <span>Missing entity data means AI can't connect your brand to topics</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-destructive rounded-full mt-2 flex-shrink-0"></div>
                  <span>Slow, uncrawlable sites get deprioritized in AI responses</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-destructive rounded-full mt-2 flex-shrink-0"></div>
                  <span>Your competitors are already optimizing for GEO</span>
                </li>
              </ul>
            </Card>
            
            <Card className="p-6 border-primary/30 bg-primary/5">
              <Target className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-3">The Solution</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Comprehensive technical analysis across 6 key modules</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Entity optimization scoring for AI comprehension</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>AI-readiness checks including llms.txt and structured data</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Prioritized, actionable recommendations with clear impact</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* The 6-Module Framework */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              The 6-Module Audit Framework
            </h2>
            <p className="text-xl text-muted-foreground">
              A comprehensive approach to technical SEO optimized for AI search visibility
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Globe className="w-10 h-10 text-primary" />
                <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">20%</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Crawl Health</h3>
              <p className="text-muted-foreground mb-4">
                Ensure AI crawlers can efficiently discover and index your content.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Robots.txt configuration</li>
                <li>• Sitemap validation</li>
                <li>• URL structure analysis</li>
                <li>• Redirect chain detection</li>
              </ul>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Zap className="w-10 h-10 text-primary" />
                <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">15%</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Performance</h3>
              <p className="text-muted-foreground mb-4">
                Fast sites get crawled more frequently and prioritized in AI responses.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Core Web Vitals</li>
                <li>• Page load speed</li>
                <li>• Mobile responsiveness</li>
                <li>• Resource optimization</li>
              </ul>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <FileSearch className="w-10 h-10 text-primary" />
                <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">15%</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">On-Page SEO</h3>
              <p className="text-muted-foreground mb-4">
                Optimize the content signals that AI models use to understand your pages.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Title & meta optimization</li>
                <li>• Heading structure</li>
                <li>• Content quality signals</li>
                <li>• Image alt text coverage</li>
              </ul>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Brain className="w-10 h-10 text-primary" />
                <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">20%</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Entity Optimization</h3>
              <p className="text-muted-foreground mb-4">
                Help AI models understand your brand, products, and topic authority.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Schema.org markup</li>
                <li>• Knowledge graph signals</li>
                <li>• Brand entity clarity</li>
                <li>• Topic clustering</li>
              </ul>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <BarChart3 className="w-10 h-10 text-primary" />
                <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">20%</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">AI Readiness</h3>
              <p className="text-muted-foreground mb-4">
                Specific optimizations for AI search engines and LLM crawlers.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• llms.txt file presence</li>
                <li>• AI crawler accessibility</li>
                <li>• Content freshness</li>
                <li>• Answer-ready content</li>
              </ul>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Link2 className="w-10 h-10 text-primary" />
                <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">10%</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Off-Site Signals</h3>
              <p className="text-muted-foreground mb-4">
                External factors that influence AI models' perception of your authority.
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Citation sources</li>
                <li>• Brand mentions</li>
                <li>• Authority signals</li>
                <li>• Reference quality</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              How Site Audit Works
            </h2>
            <p className="text-xl text-muted-foreground">
              From scan to actionable recommendations in minutes
            </p>
          </div>
          
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/3">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mb-4">1</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Enter Your Domain</h3>
                <p className="text-muted-foreground">
                  Simply enter your website URL and configure crawl settings (up to 500 pages).
                </p>
              </div>
              <div className="md:w-2/3">
                <Card className="p-6 bg-primary/5">
                  <p className="text-sm text-muted-foreground">
                    Configure crawl limits, subdomain inclusion, and let our intelligent crawler discover your site structure.
                  </p>
                </Card>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/3">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mb-4">2</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Automated Analysis</h3>
                <p className="text-muted-foreground">
                  Our system crawls your site and runs 50+ checks across all 6 audit modules.
                </p>
              </div>
              <div className="md:w-2/3">
                <Card className="p-6 bg-primary/5">
                  <p className="text-sm text-muted-foreground">
                    Watch real-time progress as we analyze crawlability, performance, SEO, entities, AI readiness, and off-site signals.
                  </p>
                </Card>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/3">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold mb-4">3</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Get Your Score & Fixes</h3>
                <p className="text-muted-foreground">
                  Receive a weighted score with prioritized, actionable recommendations.
                </p>
              </div>
              <div className="md:w-2/3">
                <Card className="p-6 bg-primary/5">
                  <p className="text-sm text-muted-foreground">
                    Each issue includes severity, impact estimation, and clear fix instructions to improve your AI search visibility.
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              The Impact of Technical Optimization on AI Visibility
            </h2>
            <p className="text-xl text-muted-foreground">
              Websites optimized for AI search see measurable improvements
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <Card className="p-6 text-center">
              <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
              <div className="text-4xl font-bold text-foreground mb-2">3.2x</div>
              <p className="text-muted-foreground">More AI recommendations after fixing critical issues</p>
            </Card>
            
            <Card className="p-6 text-center">
              <Globe className="w-12 h-12 text-primary mx-auto mb-4" />
              <div className="text-4xl font-bold text-foreground mb-2">47%</div>
              <p className="text-muted-foreground">Average improvement in visibility score within 90 days</p>
            </Card>
            
            <Card className="p-6 text-center">
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <div className="text-4xl font-bold text-foreground mb-2">2hrs</div>
              <p className="text-muted-foreground">Average time to fix high-priority audit issues</p>
            </Card>
          </div>
          
          <Card className="p-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-foreground mb-4">
                "After running the Site Audit and implementing the fixes, our brand started appearing in ChatGPT responses within 3 weeks."
              </h3>
              <p className="text-muted-foreground">
                — Marketing Director, Mid-Market SaaS Company
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Optimize Your Site for AI Search?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Run your free site audit today and discover what's holding your brand back from AI visibility.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" asChild className="text-lg px-8 py-6">
              <a href="https://llumos.app/lp/ai-visibility" target="_blank" rel="noopener noreferrer">Get Your AI Visibility Score <ArrowRight className="ml-2 w-5 h-5" /></a>
            </Button>
            <Button variant="outline" size="lg" asChild className="text-lg px-8 py-6">
            <a href="https://calendly.com/llumos-info/llumos-demo" target="_blank" rel="noopener noreferrer">
              Book a Demo
            </a>
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            Free audit included • No credit card required • Results in minutes
          </p>
        </div>
      </section>

      {/* Related Features */}
      <RelatedFeatures currentFeature="/features/site-audit" />

      {/* Footer */}
      <footer className="py-12 px-4 border-t bg-background">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Search className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-foreground">Llumos</span>
          </div>
          <p className="text-muted-foreground mb-4">
            AI Search Visibility Platform
          </p>
          <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/features" className="hover:text-foreground transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SiteAudit;
