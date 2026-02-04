import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, Eye, Clock, Sparkles, Shield } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEOHelmet } from '@/components/SEOHelmet';
import { Footer } from '@/components/Footer';

export default function FreePlan() {
  const features = [
    {
      icon: Eye,
      title: '5 Prompts Weekly',
      description: 'Track up to 5 prompts per week to monitor how AI platforms mention your brand in search results'
    },
    {
      icon: Clock,
      title: 'Weekly Updates',
      description: 'Receive weekly visibility reports showing your brand presence across AI search platforms'
    },
    {
      icon: Sparkles,
      title: '1 AI Platform',
      description: 'Start with ChatGPT monitoring to understand your baseline AI search visibility'
    },
    {
      icon: Shield,
      title: 'Read-Only Dashboard',
      description: 'Access essential visibility metrics and track your brand mentions over time'
    }
  ];

  const useCases = [
    'Exploring AI search visibility for the first time',
    'Small businesses with limited marketing budgets',
    'Freelancers checking their personal brand presence',
    'Testing Llumos before upgrading to a paid plan'
  ];

  const limitations = [
    'Limited to 5 prompts per week (not daily)',
    'Only 1 AI platform (ChatGPT only)',
    'No competitor tracking available',
    'No AI-powered recommendations or optimizations',
    'Read-only dashboard access',
    'No Content Studio access'
  ];

  const comparisonToStarter = [
    { feature: 'Prompts', free: '5 per week', starter: '25 per day' },
    { feature: 'AI Platforms', free: '1 (ChatGPT)', starter: '2 (ChatGPT + Perplexity)' },
    { feature: 'Update Frequency', free: 'Weekly', starter: 'Real-time' },
    { feature: 'Dashboard Access', free: 'Read-only', starter: 'Full access' },
    { feature: 'Competitor Tracking', free: 'Not included', starter: 'Not included' },
    { feature: 'Support', free: 'Community', starter: 'Email support' }
  ];

  return (
    <>
      <SEOHelmet
        title="Free Plan - AI Search Visibility"
        description="Start tracking your AI visibility for free. Monitor 5 prompts weekly on ChatGPT with our free forever plan."
        keywords="free AI tracking, AI search visibility, ChatGPT monitoring, free SEO tool, brand visibility"
        canonicalPath="/plans/free"
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
              <Link to="/signup">
                <Button>Get Started Free</Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary">
              Free Forever
            </Badge>
            <h1 className="text-5xl font-bold mb-4">Start Tracking AI Visibility for Free</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Discover how AI search engines like ChatGPT represent your brand. No credit card required, no time limits—get started with our free plan and upgrade when you're ready.
            </p>
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary">$0</div>
                <div className="text-muted-foreground">forever</div>
              </div>
            </div>
            <Link to="/signup">
              <Button size="lg" className="text-lg px-8">
                Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* What is AI Search Visibility */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-2xl">What is AI Search Visibility?</CardTitle>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none">
                <p className="text-muted-foreground">
                  AI search visibility measures how often and how prominently your brand appears in AI-powered search responses from platforms like ChatGPT, Perplexity, Google AI Overviews, and Gemini. Unlike traditional SEO, AI visibility isn't about ranking on a page—it's about being mentioned, recommended, and accurately described when users ask AI assistants questions related to your industry.
                </p>
                <p className="text-muted-foreground">
                  With more users turning to AI for product recommendations, business research, and purchasing decisions, understanding your AI visibility has become essential. Llumos tracks these mentions so you can see exactly how AI systems perceive and present your brand to potential customers.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Key Features */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">What's Included in the Free Plan</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature) => (
                <Card key={feature.title}>
                  <CardHeader>
                    <feature.icon className="h-10 w-10 text-primary mb-2" aria-hidden="true" />
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Detailed Features List */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">All Free Plan Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                    <span>1 user account</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                    <span>5 prompts tracked weekly</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                    <span>1 AI platform (ChatGPT)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                    <span>Weekly visibility updates</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                    <span>Basic analytics dashboard</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                    <span>Brand mention tracking</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                    <span>Domain verification</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary mt-1 flex-shrink-0" aria-hidden="true" />
                    <span>Community support</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Best For and Limitations */}
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 mb-12">
            <Card>
              <CardHeader>
                <CardTitle>Perfect For</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {useCases.map((useCase) => (
                    <li key={useCase} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <span>{useCase}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Limitations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {limitations.map((limitation) => (
                    <li key={limitation} className="flex items-start gap-2 text-muted-foreground">
                      <span className="text-lg" aria-hidden="true">•</span>
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Comparison Table */}
          <div className="max-w-4xl mx-auto mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Free vs Starter Plan</CardTitle>
                <CardDescription>
                  See how the Free plan compares to our entry-level paid plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Feature</th>
                        <th className="text-center py-3 px-4 font-medium">Free</th>
                        <th className="text-center py-3 px-4 font-medium">Starter ($49/mo)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonToStarter.map((row) => (
                        <tr key={row.feature} className="border-b last:border-0">
                          <td className="py-3 px-4">{row.feature}</td>
                          <td className="text-center py-3 px-4 text-muted-foreground">{row.free}</td>
                          <td className="text-center py-3 px-4">{row.starter}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Is the Free plan really free forever?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Yes! The Free plan has no time limits or hidden fees. You can use it indefinitely to track your AI visibility. We offer it because we believe everyone should understand how AI represents their brand. When you're ready for more features, you can upgrade to a paid plan.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Do I need a credit card to sign up?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    No credit card is required for the Free plan. Simply create an account with your email and start tracking your AI visibility immediately.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Can I upgrade to a paid plan later?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Absolutely! You can upgrade to Starter, Growth, Pro, or Agency plans at any time from your dashboard. All your existing data and prompts will be preserved when you upgrade.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What happens if I exceed the 5 weekly prompts?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    If you reach your weekly limit, you'll need to wait until the next week for your prompts to reset, or upgrade to a paid plan for more capacity. We'll notify you when you're approaching your limit.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="max-w-4xl mx-auto">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-2xl">Need More Power?</CardTitle>
                <CardDescription>
                  Upgrade to our Starter plan for daily tracking, more AI platforms, and real-time updates. All paid plans include a 7-day free trial.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-4">
                <Link to="/signup">
                  <Button size="lg">Start Free Account</Button>
                </Link>
                <Link to="/pricing">
                  <Button variant="outline" size="lg">Compare All Plans</Button>
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
