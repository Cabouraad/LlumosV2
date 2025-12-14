import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, Users, Zap, Target, Building2, LineChart, Sparkles, Crown, Shield, Briefcase, HeadphonesIcon, FileText, Globe } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEOHelmet } from '@/components/SEOHelmet';
import { Footer } from '@/components/Footer';

export default function AgencyPlan() {
  const features = [
    {
      icon: Users,
      title: 'Up to 10 User Accounts',
      description: 'Full team access for agencies and enterprises with granular role management'
    },
    {
      icon: Target,
      title: '300 Prompts Tracked Daily',
      description: 'Enterprise-level tracking capacity for comprehensive brand monitoring across all AI platforms'
    },
    {
      icon: Zap,
      title: 'All 4 AI Platforms',
      description: 'Complete coverage across ChatGPT, Perplexity, Gemini, and Google AI Overviews'
    },
    {
      icon: Building2,
      title: 'Up to 10 Brands',
      description: 'Manage multiple client brands or business units from a single unified dashboard'
    },
    {
      icon: LineChart,
      title: 'Track 50 Competitors',
      description: 'Deep competitive analysis across your entire market landscape for all brands'
    },
    {
      icon: Sparkles,
      title: 'Custom Optimization Plans',
      description: 'Tailored strategies based on your specific brand positioning and goals'
    },
    {
      icon: FileText,
      title: 'Content Studio',
      description: 'AI-powered content creation with guided frameworks and writing assistance'
    },
    {
      icon: HeadphonesIcon,
      title: 'Dedicated Account Manager',
      description: 'Personal support and strategic guidance for your team\'s success'
    },
    {
      icon: Shield,
      title: 'White-Label Reports',
      description: 'Fully branded PDF reports perfect for client presentations and stakeholder updates'
    },
    {
      icon: Globe,
      title: 'Multi-Brand Management',
      description: 'Seamlessly switch between brands with isolated data and independent analytics'
    }
  ];

  const useCases = [
    'Digital marketing agencies managing multiple client accounts',
    'Enterprise companies with multiple product brands',
    'Holding companies tracking subsidiary visibility',
    'Consultancies providing AI visibility services',
    'Media companies monitoring publication presence',
    'E-commerce businesses with multiple storefronts'
  ];

  const whyAgencies = [
    {
      title: 'Scale Without Limits',
      description: 'Manage 10 brands with 300 daily prompts each, covering your entire client roster.'
    },
    {
      title: 'Client-Ready Reports',
      description: 'Generate professional white-label reports that showcase your agency\'s value.'
    },
    {
      title: 'Dedicated Support',
      description: 'Get a personal account manager who understands agency needs and client pressures.'
    },
    {
      title: 'Competitive Edge',
      description: 'Track 50 competitors per brand to deliver unmatched market intelligence.'
    }
  ];

  return (
    <>
      <SEOHelmet
        title="Agency Plan - Enterprise AI Search Visibility for Agencies"
        description="Manage up to 10 brands with 300 daily prompts, white-label reports, and dedicated support. Built for agencies and enterprises managing AI visibility at scale. $399/month."
        keywords="agency AI tracking, white-label AI reports, multi-brand management, enterprise AI visibility, agency SEO tools"
        canonicalPath="/plans/agency"
      />
      <div className="min-h-screen bg-gradient-bg">
        {/* Header */}
        <header className="border-b border-border/30 bg-card/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Logo collapsed={false} />
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link to="/pricing">
                <Button variant="outline">View All Plans</Button>
              </Link>
              <Link to="/contact-sales">
                <Button>Contact Sales</Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <Badge className="mb-4 bg-gradient-to-r from-primary to-primary/60">
              <Crown className="w-3 h-3 mr-1" /> Agency & Enterprise
            </Badge>
            <h1 className="text-5xl font-bold mb-4">Built for Agencies. Scaled for Enterprise.</h1>
            <p className="text-xl text-muted-foreground mb-8">
              The complete AI search visibility solution for agencies and enterprises managing multiple brands at scale.
              Track, optimize, and report on AI visibility across ChatGPT, Perplexity, Gemini, and Google AI Overviews.
            </p>
            <div className="flex items-center justify-center gap-6 mb-8">
              <div className="text-center">
                <div className="text-5xl font-bold">$399</div>
                <div className="text-muted-foreground">per month</div>
              </div>
              <div className="text-muted-foreground text-2xl">or</div>
              <div className="text-center">
                <div className="text-5xl font-bold">$3,990</div>
                <div className="text-muted-foreground">per year</div>
                <Badge variant="secondary" className="mt-2">Save 17%</Badge>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact-sales">
                <Button size="lg" className="text-lg px-8">
                  Contact Sales <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  Watch Demo
                </Button>
              </Link>
            </div>
          </div>

          {/* Why Choose Agency */}
          <div className="max-w-6xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">Why Agencies Choose Llumos</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {whyAgencies.map((item) => (
                <Card key={item.title} className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Key Features Grid */}
          <div className="max-w-6xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">Everything You Need to Dominate AI Search</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="border-border/50 bg-card/50">
                  <CardHeader>
                    <feature.icon className="h-10 w-10 text-primary mb-2" />
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription className="text-sm">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Complete Feature List */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card className="shadow-elevated">
              <CardHeader>
                <CardTitle className="text-2xl">Complete Agency Feature Set</CardTitle>
                <CardDescription>Everything included in the Agency plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    'Up to 10 user accounts',
                    '300 prompts tracked daily',
                    'All 4 AI platforms',
                    'Up to 10 brands',
                    'Track 50 competitors',
                    'Custom optimization plans',
                    'Content Studio',
                    'Dedicated account manager',
                    'White-label reports',
                    'Multi-brand management',
                    'Priority support (24/7)',
                    'Advanced API access',
                    'Custom data exports',
                    'Quarterly strategy reviews',
                    'Custom integrations available',
                    'SLA guarantees'
                  ].map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Perfect For Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Perfect For</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid md:grid-cols-2 gap-4">
                  {useCases.map((useCase) => (
                    <li key={useCase} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-lg">{useCase}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl">Ready to Scale Your AI Visibility?</CardTitle>
                <CardDescription className="text-lg">
                  Talk to our sales team to learn how Llumos can help your agency or enterprise succeed.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/contact-sales">
                  <Button size="lg" className="px-8">
                    Contact Sales <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button size="lg" variant="outline">Compare All Plans</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
