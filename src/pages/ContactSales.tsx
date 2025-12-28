import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, Building2, Users, Zap, Shield, Send, Loader2 } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEOHelmet } from '@/components/SEOHelmet';
import { Footer } from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function ContactSales() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    website: '',
    teamSize: '',
    brandsCount: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || !formData.company.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive'
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Send email via edge function
      const { error } = await supabase.functions.invoke('send-sales-inquiry', {
        body: {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          company: formData.company.trim(),
          website: formData.website.trim() || 'Not provided',
          teamSize: formData.teamSize || 'Not specified',
          brandsCount: formData.brandsCount || 'Not specified',
          message: formData.message.trim() || 'No additional message'
        }
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: 'Message Sent!',
        description: 'Our sales team will reach out within 24 hours.'
      });
    } catch (error: any) {
      console.error('Contact form error:', error);
      toast({
        title: 'Error Sending Message',
        description: 'Please try again or email us directly at info@llumos.app',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: Building2, title: 'Up to 10 Brands', description: 'Manage multiple clients from one dashboard' },
    { icon: Users, title: '10 Team Members', description: 'Collaborate with your entire agency team' },
    { icon: Zap, title: '300 Daily Prompts', description: 'Enterprise-level tracking capacity' },
    { icon: Shield, title: 'White-Label Reports', description: 'Professional branded reports for clients' }
  ];

  if (submitted) {
    return (
      <>
        <SEOHelmet
          title="Thank You - Llumos Sales"
          description="Thank you for contacting Llumos sales. Our team will reach out within 24 hours."
          canonicalPath="/contact-sales"
        />
        <div className="min-h-screen bg-gradient-bg">
          <header className="border-b border-border/30 bg-card/30 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
              <Logo collapsed={false} />
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <Link to="/pricing">
                  <Button variant="outline">View Pricing</Button>
                </Link>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 py-20">
            <div className="max-w-xl mx-auto text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Thank You!</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Your message has been received. Our sales team will reach out to you within 24 hours to discuss how Llumos can help your agency succeed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/demo">
                  <Button size="lg">
                    Watch Demo While You Wait
                  </Button>
                </Link>
                <Link to="/">
                  <Button size="lg" variant="outline">
                    Return to Home
                  </Button>
                </Link>
              </div>
            </div>
          </main>

          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHelmet
        title="Contact Sales - Llumos Agency & Enterprise Plans"
        description="Get in touch with our sales team to learn about Llumos Agency and Enterprise plans. Custom solutions for agencies managing multiple brands."
        keywords="contact sales, agency pricing, enterprise AI visibility, custom plans"
        canonicalPath="/contact-sales"
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
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Left Column - Info */}
              <div className="space-y-8">
                <div>
                  <Badge className="mb-4">Agency & Enterprise</Badge>
                  <h1 className="text-4xl font-bold mb-4">Let's Talk About Your AI Visibility Goals</h1>
                  <p className="text-lg text-muted-foreground">
                    Our sales team will help you understand how Llumos can scale with your agency or enterprise needs.
                    Get a personalized demo and custom pricing for your organization.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {benefits.map((benefit) => (
                    <Card key={benefit.title} className="bg-card/50">
                      <CardHeader className="pb-2">
                        <benefit.icon className="h-8 w-8 text-primary mb-2" />
                        <CardTitle className="text-base">{benefit.title}</CardTitle>
                        <CardDescription className="text-sm">{benefit.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-3">Starting at</p>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-4xl font-bold">$399</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Custom onboarding & training</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Dedicated account manager</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Priority support & SLA</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-violet-500/20 bg-violet-500/5">
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Prefer to talk now?</p>
                    <Button size="lg" className="w-full" asChild>
                      <a href="https://calendly.com/llumos-info/llumos-demo" target="_blank" rel="noopener noreferrer">
                        Book a Demo Call
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Form */}
              <div>
                <Card className="shadow-elevated">
                  <CardHeader>
                    <CardTitle>Contact Our Sales Team</CardTitle>
                    <CardDescription>
                      Fill out the form below and we'll get back to you within 24 hours.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                            placeholder="John"
                            required
                            maxLength={50}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                            placeholder="Doe"
                            required
                            maxLength={50}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Work Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="john@agency.com"
                          required
                          maxLength={255}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company">Company Name *</Label>
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                          placeholder="Acme Agency"
                          required
                          maxLength={100}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          value={formData.website}
                          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="https://acmeagency.com"
                          maxLength={200}
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="teamSize">Team Size</Label>
                          <Select
                            value={formData.teamSize}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, teamSize: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1-5">1-5 people</SelectItem>
                              <SelectItem value="6-20">6-20 people</SelectItem>
                              <SelectItem value="21-50">21-50 people</SelectItem>
                              <SelectItem value="51-200">51-200 people</SelectItem>
                              <SelectItem value="200+">200+ people</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="brandsCount">Brands to Track</Label>
                          <Select
                            value={formData.brandsCount}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, brandsCount: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1-3">1-3 brands</SelectItem>
                              <SelectItem value="4-10">4-10 brands</SelectItem>
                              <SelectItem value="11-25">11-25 brands</SelectItem>
                              <SelectItem value="25+">25+ brands</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">How can we help?</Label>
                        <Textarea
                          id="message"
                          value={formData.message}
                          onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Tell us about your AI visibility goals, current challenges, or questions..."
                          rows={4}
                          maxLength={1000}
                        />
                      </div>

                      <Button type="submit" size="lg" className="w-full" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send Message
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        By submitting, you agree to our{' '}
                        <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link>
                        {' '}and{' '}
                        <Link to="/terms" className="underline hover:text-primary">Terms of Service</Link>.
                      </p>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}
