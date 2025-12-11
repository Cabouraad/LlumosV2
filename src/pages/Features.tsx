import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  Target, 
  TrendingUp, 
  Zap, 
  CheckCircle, 
  ArrowRight,
  BarChart3,
  AlertTriangle,
  Users,
  Globe,
  Eye,
  Lightbulb,
  Clock,
  RefreshCw,
  Star,
  Award,
  Sparkles,
  FileText,
  Bot,
  Search
} from 'lucide-react';
import { SEOHelmet } from '@/components/SEOHelmet';
import { MarketingLayout } from '@/components/landing/MarketingLayout';
import { motion } from 'framer-motion';

const Features = () => {
  return (
    <>
      <SEOHelmet
        title="Features - AI Search Visibility Platform"
        description="Explore Llumos features: brand visibility monitoring, competitive analysis, actionable recommendations, and multi-platform AI search tracking across ChatGPT, Gemini, and Perplexity."
        keywords="AI visibility features, brand monitoring, competitive analysis, ChatGPT tracking, AI SEO tools, Perplexity monitoring"
        canonicalPath="/features"
        ogImage="/og-home.png"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Llumos",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          featureList: [
            "Brand Visibility Monitoring",
            "Competitive Analysis", 
            "Actionable Recommendations",
            "Multi-Platform AI Coverage",
            "Real-Time Tracking",
            "Content Optimization"
          ]
        }}
      />
      <MarketingLayout>
        {/* Hero Section */}
        <section className="pt-28 pb-16 px-4 relative overflow-hidden">
          <div className="container mx-auto text-center max-w-5xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-6 text-sm py-1.5 px-4 bg-violet-500/10 border-violet-500/20 text-violet-400">
                <Sparkles className="w-3 h-3 mr-1 inline" />
                Complete AI Search Optimization Platform
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Powerful Features Built For
                <span className="block mt-2 bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                  AI Search Domination
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
                Everything you need to monitor, analyze, and optimize your brand's presence across all major AI platforms - in one unified dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  asChild 
                  className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0 shadow-lg shadow-violet-500/25"
                >
                  <Link to="/signup">
                    Start Free — No Credit Card
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-white/10 hover:bg-white/5">
                  <Link to="/free-checker">See How It Works - Free Report</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Value Props Bar */}
        <section className="py-8 px-4 bg-white/5 backdrop-blur border-y border-white/5">
          <div className="container mx-auto max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="flex items-center justify-center gap-3">
                <Award className="w-6 h-6 text-violet-400" />
                <span className="text-sm font-medium">Industry-Leading Accuracy</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Clock className="w-6 h-6 text-violet-400" />
                <span className="text-sm font-medium">Real-Time Monitoring</span>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Star className="w-6 h-6 text-violet-400 fill-violet-400" />
                <span className="text-sm font-medium">4.9/5 Customer Rating</span>
              </div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Feature 1: Brand Visibility Monitoring */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Card className="p-8 h-full bg-white/5 border-white/10 hover:border-violet-500/50 transition-all">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mb-6">
                    <Target className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-4">Brand Visibility Monitoring</h2>
                  <p className="text-muted-foreground mb-6">
                    Real-time tracking of your brand's presence across all major AI search platforms.
                  </p>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Eye className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Multi-Platform Coverage</h4>
                        <p className="text-sm text-muted-foreground">Monitor ChatGPT, Gemini, Perplexity, and more</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <BarChart3 className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Visibility Scoring</h4>
                        <p className="text-sm text-muted-foreground">Quantified metrics for tracking improvement</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <RefreshCw className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Automated Tracking</h4>
                        <p className="text-sm text-muted-foreground">Daily scans with instant alerts</p>
                      </div>
                    </div>
                  </div>

                  <Button asChild className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0">
                    <Link to="/features/brand-visibility">
                      Learn More <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </Card>
              </motion.div>

              {/* Feature 2: Competitive Analysis */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="p-8 h-full bg-white/5 border-white/10 hover:border-violet-500/50 transition-all">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mb-6">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-4">Competitive Analysis</h2>
                  <p className="text-muted-foreground mb-6">
                    See exactly where competitors dominate AI search and identify opportunities.
                  </p>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Competitor Benchmarking</h4>
                        <p className="text-sm text-muted-foreground">Track up to 10 competitors</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Target className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Gap Analysis</h4>
                        <p className="text-sm text-muted-foreground">Identify queries where competitors rank</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <BarChart3 className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Market Share Insights</h4>
                        <p className="text-sm text-muted-foreground">See your share of voice</p>
                      </div>
                    </div>
                  </div>

                  <Button asChild className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0">
                    <Link to="/features/competitive-analysis">
                      Learn More <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </Card>
              </motion.div>

              {/* Feature 3: Actionable Recommendations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="p-8 h-full bg-white/5 border-white/10 hover:border-violet-500/50 transition-all">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center mb-6">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-4">Actionable Recommendations</h2>
                  <p className="text-muted-foreground mb-6">
                    Skip the guesswork. Get specific, prioritized actions to improve rankings.
                  </p>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">AI-Powered Insights</h4>
                        <p className="text-sm text-muted-foreground">Machine learning identifies opportunities</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Globe className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Content Optimization</h4>
                        <p className="text-sm text-muted-foreground">Specific suggestions for improvements</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">Implementation Tracking</h4>
                        <p className="text-sm text-muted-foreground">Mark complete and track results</p>
                      </div>
                    </div>
                  </div>

                  <Button asChild className="w-full bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0">
                    <Link to="/features/actionable-recommendations">
                      Learn More <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Platform Coverage */}
        <section className="py-16 px-4 bg-white/5">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">
                Complete AI Platform Coverage
              </h2>
              <p className="text-xl text-muted-foreground">
                Monitor your brand across all 4 major AI search platforms
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {['ChatGPT', 'Gemini', 'Perplexity', 'Claude'].map((platform, i) => (
                <motion.div
                  key={platform}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="p-6 text-center bg-white/5 border-white/10 hover:border-violet-500/50 transition-all">
                    <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/20">
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-semibold mb-2">{platform}</h3>
                    <Badge className="text-xs bg-violet-500/10 text-violet-400 border-violet-500/20">
                      {i === 0 ? 'Most Popular' : i === 1 ? 'Enterprise' : i === 2 ? 'Research' : 'Premium'}
                    </Badge>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-3xl text-center">
            <Card className="p-12 bg-gradient-to-br from-violet-500/10 to-blue-500/10 border-violet-500/20">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Dominate AI Search?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Start tracking your brand's visibility across ChatGPT, Gemini, and Perplexity today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  asChild
                  className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0 shadow-lg shadow-violet-500/25"
                >
                  <Link to="/signup">
                    Start Free Trial
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-white/10 hover:bg-white/5">
                  <Link to="/demo">Watch Demo</Link>
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </MarketingLayout>
    </>
  );
};

export default Features;
