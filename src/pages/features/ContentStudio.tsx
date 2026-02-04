import { SEOHead } from '@/components/seo/SEOHead';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Sparkles, 
  Target, 
  Search, 
  CheckCircle2, 
  ArrowRight,
  Lightbulb,
  BarChart3,
  Zap,
  BookOpen,
  Bot,
  TrendingUp,
  Wand2,
  Layout,
  Globe,
  Calendar,
  Download,
  Eye,
  Edit3,
  Code,
  Gauge,
  Clock,
  FileCode,
  PenTool,
  LayoutTemplate,
  Save
} from 'lucide-react';
import { RelatedFeatures } from '@/components/seo/RelatedFeatures';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Llumos Content Studio",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "AI-powered content creation platform for Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO). Create content that ranks in ChatGPT, Google AI Overviews, Perplexity, and other AI search engines.",
  "offers": {
    "@type": "Offer",
    "price": "79",
    "priceCurrency": "USD"
  },
  "featureList": [
    "AI Content Blueprints",
    "Inline AI Text Editing",
    "Real-time SEO Scoring",
    "Content Templates",
    "WordPress Integration",
    "Auto-save & Version History",
    "SEO Metadata Generation",
    "Schema Markup Suggestions",
    "Multi-format Export",
    "Answer Engine Optimization",
    "Generative Engine Optimization"
  ]
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is Answer Engine Optimization (AEO)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Answer Engine Optimization (AEO) is the practice of optimizing content to appear in AI-powered answer engines like ChatGPT, Google AI Overviews, Perplexity, and Claude. Unlike traditional SEO which focuses on search engine rankings, AEO focuses on making your content the source that AI systems cite when answering user questions."
      }
    },
    {
      "@type": "Question", 
      "name": "What is Generative Engine Optimization (GEO)?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Generative Engine Optimization (GEO) is a content strategy focused on optimizing for generative AI platforms. GEO ensures your brand and content are referenced when AI systems generate responses to user queries. This includes optimizing for ChatGPT, Google Gemini, Perplexity AI, and other large language model-based search tools."
      }
    },
    {
      "@type": "Question",
      "name": "What features does Content Studio include?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Content Studio includes AI content blueprints, inline AI text editing (rewrite, expand, shorten, improve), real-time SEO scoring, 8 content templates, WordPress integration for direct publishing, auto-save with local backup, SEO metadata generation, schema markup suggestions, and multi-format export (Markdown, HTML)."
      }
    },
    {
      "@type": "Question",
      "name": "How does Content Studio help with AI Search optimization?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Content Studio analyzes your brand's visibility gaps across AI platforms and generates detailed content blueprints designed to improve your AI search presence. It provides structured outlines, FAQ suggestions, schema markup recommendations, and AI writing assistance to create content that AI systems are more likely to cite."
      }
    },
    {
      "@type": "Question",
      "name": "Can I publish directly to WordPress from Content Studio?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, Content Studio includes WordPress integration that allows you to connect your WordPress site and publish or schedule content directly from the platform. You can publish immediately or schedule posts for future publication dates."
      }
    }
  ]
};

const breadcrumbData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://llumos.app"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Features",
      "item": "https://llumos.app/features"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Content Studio",
      "item": "https://llumos.app/features/content-studio"
    }
  ]
};

const features = [
  {
    icon: Wand2,
    title: "Inline AI Text Editing",
    description: "Select any text and instantly rewrite, expand, shorten, improve, or simplify it with AI assistance. Get contextual suggestions that maintain your brand voice.",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    badge: "New"
  },
  {
    icon: Gauge,
    title: "Real-time SEO Scoring",
    description: "Get instant feedback on content quality with live SEO scores. Track title optimization, meta descriptions, heading structure, keyword usage, and readability.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    badge: "New"
  },
  {
    icon: LayoutTemplate,
    title: "8 Content Templates",
    description: "Choose from Blog Post, How-To Guide, Comparison Article, Product Review, FAQ Page, Listicle, Case Study, or Pillar Page templates to jumpstart your content.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    badge: "New"
  },
  {
    icon: Globe,
    title: "WordPress Integration",
    description: "Connect your WordPress site and publish or schedule content directly. No copy-pasting required—go from draft to live in one click.",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    badge: "New"
  },
  {
    icon: Save,
    title: "Auto-save & Local Backup",
    description: "Never lose your work with intelligent auto-save that persists to both database and local storage. See save status in real-time as you write.",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    badge: "New"
  },
  {
    icon: FileCode,
    title: "SEO Metadata Generation",
    description: "Auto-generate optimized title tags, meta descriptions, focus keywords, and JSON-LD schema markup based on your content type and topic.",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    badge: "New"
  },
  {
    icon: FileText,
    title: "AI Content Blueprints",
    description: "Get detailed section-by-section outlines with talking points, FAQ suggestions, key entities to mention, and schema recommendations.",
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    icon: Download,
    title: "Multi-format Export",
    description: "Download your finished content as Markdown or HTML. Perfect for use in any CMS, static site generator, or documentation platform.",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10"
  }
];

const workflowSteps = [
  {
    step: 1,
    icon: Search,
    title: "Identify Visibility Gaps",
    description: "Llumos monitors AI platforms for your brand. When visibility is low for specific topics, Content Studio generates targeted blueprints."
  },
  {
    step: 2,
    icon: LayoutTemplate,
    title: "Choose Template & Preferences",
    description: "Select from 8 content templates and customize tone, style, audience, and format before generating your blueprint."
  },
  {
    step: 3,
    icon: FileText,
    title: "Generate AI Blueprint",
    description: "Get structured outlines, FAQs, key entities, schema suggestions, and LLM targeting recommendations in seconds."
  },
  {
    step: 4,
    icon: PenTool,
    title: "Write with AI Assistance",
    description: "Use inline AI editing to rewrite, expand, or improve any section. Get real-time SEO scoring as you write."
  },
  {
    step: 5,
    icon: Globe,
    title: "Publish Everywhere",
    description: "Export to Markdown/HTML or publish directly to WordPress. Schedule posts for optimal timing."
  }
];

export default function ContentStudioFeature() {
  return (
    <>
      <SEOHead
        title="Content Studio for AEO & GEO | AI Search Content Optimization"
        description="Create AI-optimized content with Llumos Content Studio. Features inline AI editing, real-time SEO scoring, WordPress integration, content templates, and auto-save. Master Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO)."
        keywords="AEO, Answer Engine Optimization, GEO, Generative Engine Optimization, AI content, AI search optimization, ChatGPT SEO, AI visibility, content studio, AI content strategy, WordPress publishing, SEO scoring, content templates"
        canonical="/features/content-studio"
        ogImage="/og-content-studio.png"
        schemaJson={[structuredData, faqStructuredData, breadcrumbData]}
      />

      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src="/lovable-uploads/a3631033-2657-4c97-8fd8-079913859ab0.png" alt="Llumos - AI Search Visibility Platform" className="h-8" loading="eager" />
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link to="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link to="/resources" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Resources
              </Link>
              <Link to="/demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Demo
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link to="/signin">Sign In</Link>
              </Button>
              <Button asChild>
                <Link to="/signup">Start Free Trial</Link>
              </Button>
            </div>
          </nav>
        </header>

        {/* Breadcrumb */}
        <nav className="container mx-auto px-4 py-3" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground transition-colors">Home</Link></li>
            <li>/</li>
            <li><Link to="/features" className="hover:text-foreground transition-colors">Features</Link></li>
            <li>/</li>
            <li className="text-foreground font-medium">Content Studio</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                New: Inline AI Editing, SEO Scoring & WordPress Integration
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Content Studio for{' '}
                <span className="text-primary">Answer Engine Optimization</span>{' '}
                & Generative Engine Optimization
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Create AI-optimized content that ranks in ChatGPT, Google AI Overviews, Perplexity, and other AI search engines. 
                Now with inline AI editing, real-time SEO scoring, content templates, and direct WordPress publishing.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button size="lg" asChild>
                  <Link to="/signup">
                    Start Creating AI Content
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/demo">Watch Demo</Link>
                </Button>
              </div>

              {/* Feature badges */}
              <div className="flex flex-wrap justify-center gap-3">
                <Badge variant="secondary" className="px-3 py-1.5">
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                  Inline AI Editing
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5">
                  <Gauge className="h-3.5 w-3.5 mr-1.5" />
                  Real-time SEO Score
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5">
                  <LayoutTemplate className="h-3.5 w-3.5 mr-1.5" />
                  8 Templates
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5">
                  <Globe className="h-3.5 w-3.5 mr-1.5" />
                  WordPress Publishing
                </Badge>
                <Badge variant="secondary" className="px-3 py-1.5">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Auto-save
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* What is AEO/GEO Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">What is Answer Engine Optimization (AEO)?</h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  <strong>Answer Engine Optimization (AEO)</strong> is the practice of optimizing your content to appear as 
                  the authoritative source in AI-powered answer engines. Unlike traditional SEO which focuses on ranking 
                  in search results, AEO ensures your brand is cited when AI assistants answer user questions.
                </p>
                <p className="text-muted-foreground">
                  With the rise of ChatGPT, Google AI Overviews, and Perplexity, users increasingly get answers directly 
                  from AI without visiting websites. AEO helps your brand remain visible in this new paradigm of
                  <strong> AI search</strong> and <strong>conversational search</strong>.
                </p>
              </Card>
              
              <Card className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">What is Generative Engine Optimization (GEO)?</h2>
                </div>
                <p className="text-muted-foreground mb-4">
                  <strong>Generative Engine Optimization (GEO)</strong> focuses on making your content the preferred source 
                  for large language models (LLMs) when they generate responses. GEO strategies ensure your brand, products, 
                  and expertise are woven into AI-generated answers.
                </p>
                <p className="text-muted-foreground">
                  As <strong>generative AI</strong> transforms how people discover brands, GEO becomes essential for 
                  maintaining <strong>AI visibility</strong>. Content Studio provides the frameworks and tools to execute 
                  effective GEO strategies across all major AI platforms.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Key Features Grid */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Powerful Features for AI Content Success
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Everything you need to create, optimize, and publish content that AI systems love to cite
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="p-6 relative overflow-hidden hover:shadow-lg transition-shadow">
                  {feature.badge && (
                    <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
                      {feature.badge}
                    </Badge>
                  )}
                  <div className={`p-3 rounded-lg ${feature.bgColor} w-fit mb-4`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                From Visibility Gap to Published Content in 5 Steps
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                A streamlined workflow to create AI-optimized content that drives results
              </p>
            </div>
            
            <div className="relative">
              {/* Connection line for desktop */}
              <div className="hidden lg:block absolute top-20 left-0 right-0 h-0.5 bg-border" />
              
              <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-8">
                {workflowSteps.map((step, index) => (
                  <div key={index} className="relative text-center">
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-background border-2 border-primary mb-4 z-10">
                      <step.icon className="h-7 w-7 text-primary" />
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                        {step.step}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Inline AI Editing Spotlight */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4">New Feature</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Inline AI Text Editing
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Select any text in your content and instantly transform it with AI. Choose from 5 powerful actions:
                </p>
                <ul className="space-y-4">
                  {[
                    { action: "Rewrite", desc: "Get alternative phrasings while maintaining meaning" },
                    { action: "Expand", desc: "Add more detail and depth to any section" },
                    { action: "Shorten", desc: "Condense content while keeping key points" },
                    { action: "Improve", desc: "Enhance clarity, flow, and professionalism" },
                    { action: "Simplify", desc: "Make complex content more accessible" }
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>{item.action}:</strong>{" "}
                        <span className="text-muted-foreground">{item.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <Card className="p-6 bg-muted/50">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Edit3 className="h-4 w-4" />
                    <span>Select text to see AI options</span>
                  </div>
                  <div className="p-4 rounded-lg bg-background border">
                    <p className="text-sm leading-relaxed">
                      Our product helps businesses{" "}
                      <span className="bg-primary/20 px-1 rounded">improve their online visibility</span>{" "}
                      through advanced AI optimization techniques.
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline">
                      <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                      Rewrite
                    </Button>
                    <Button size="sm" variant="outline">Expand</Button>
                    <Button size="sm" variant="outline">Shorten</Button>
                    <Button size="sm" variant="outline">Improve</Button>
                    <Button size="sm" variant="outline">Simplify</Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* SEO Scoring Spotlight */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <Card className="p-6 order-2 md:order-1">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">SEO Score</h4>
                    <span className="text-2xl font-bold text-green-500">85/100</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Title Optimization", score: 90, status: "good" },
                      { label: "Meta Description", score: 85, status: "good" },
                      { label: "Heading Structure", score: 80, status: "good" },
                      { label: "Content Length", score: 75, status: "warning" },
                      { label: "Keyword Density", score: 90, status: "good" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 rounded-full bg-muted">
                            <div 
                              className={`h-full rounded-full ${item.status === 'good' ? 'bg-green-500' : 'bg-yellow-500'}`}
                              style={{ width: `${item.score}%` }}
                            />
                          </div>
                          <span className="w-8 text-right">{item.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              <div className="order-1 md:order-2">
                <Badge className="mb-4">New Feature</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Real-time SEO Scoring
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Get instant feedback on your content quality as you write. The SEO Score panel analyzes:
                </p>
                <ul className="space-y-3">
                  {[
                    "Title tag length and keyword placement",
                    "Meta description optimization",
                    "Heading hierarchy and structure",
                    "Content length vs. topic depth",
                    "Keyword usage and density",
                    "Readability and sentence structure"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Templates Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <Badge className="mb-4">New Feature</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                8 Content Templates to Jumpstart Your Writing
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Start with proven structures optimized for AI visibility
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "Blog Post", icon: FileText, desc: "Long-form articles with structured sections" },
                { name: "How-To Guide", icon: BookOpen, desc: "Step-by-step instructional content" },
                { name: "Comparison Article", icon: BarChart3, desc: "Side-by-side product/service comparisons" },
                { name: "Product Review", icon: Target, desc: "In-depth product analysis and ratings" },
                { name: "FAQ Page", icon: Lightbulb, desc: "Question-answer format content" },
                { name: "Listicle", icon: FileText, desc: "Numbered lists and top X articles" },
                { name: "Case Study", icon: TrendingUp, desc: "Success stories and results" },
                { name: "Pillar Page", icon: Layout, desc: "Comprehensive topic overviews" }
              ].map((template, i) => (
                <Card key={i} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <template.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-xs text-muted-foreground">{template.desc}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* WordPress Integration */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <Badge className="mb-4">New Feature</Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Publish Directly to WordPress
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Connect your WordPress site and go from draft to published in one click. No more copy-pasting or manual formatting.
                </p>
                <ul className="space-y-4">
                  {[
                    "Connect with WordPress application passwords",
                    "Publish immediately or schedule for later",
                    "Preserve formatting and structure",
                    "Set post status (draft, publish, scheduled)",
                    "Multiple site support"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-lg bg-orange-500/10">
                    <Globe className="h-8 w-8 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">WordPress Connected</h3>
                    <p className="text-sm text-muted-foreground">yourblog.com</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <Button className="w-full gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Publish Now
                  </Button>
                  <Button variant="outline" className="w-full gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule for Later
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
            </div>
            
            <div className="space-y-4">
              {[
                {
                  q: "What is Answer Engine Optimization (AEO)?",
                  a: "Answer Engine Optimization (AEO) is the practice of optimizing content to appear in AI-powered answer engines like ChatGPT, Google AI Overviews, Perplexity, and Claude. Unlike traditional SEO which focuses on search engine rankings, AEO focuses on making your content the source that AI systems cite when answering user questions."
                },
                {
                  q: "What is Generative Engine Optimization (GEO)?",
                  a: "Generative Engine Optimization (GEO) is a content strategy focused on optimizing for generative AI platforms. GEO ensures your brand and content are referenced when AI systems generate responses to user queries."
                },
                {
                  q: "What features does Content Studio include?",
                  a: "Content Studio includes AI content blueprints, inline AI text editing (rewrite, expand, shorten, improve, simplify), real-time SEO scoring, 8 content templates, WordPress integration for direct publishing, auto-save with local backup, SEO metadata generation, schema markup suggestions, and multi-format export."
                },
                {
                  q: "Can I publish directly to WordPress?",
                  a: "Yes! Content Studio includes WordPress integration that allows you to connect your WordPress site and publish or schedule content directly. You can publish immediately or set a future publish date."
                },
                {
                  q: "Which AI platforms does Content Studio optimize for?",
                  a: "Content Studio creates content optimized for ChatGPT (OpenAI), Google AI Overviews, Google Gemini, Perplexity AI, Claude (Anthropic), and other major AI assistants."
                },
                {
                  q: "What plans include Content Studio?",
                  a: "Content Studio is available on Growth and Pro plans. Start with a 7-day free trial to experience all features."
                }
              ].map((faq, i) => (
                <Card key={i} className="p-6">
                  <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground">{faq.a}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-primary text-primary-foreground">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start Creating AI-Optimized Content Today
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Join brands using Content Studio to dominate AI search results. 
              Now with inline AI editing, SEO scoring, and WordPress integration.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/signup">
                  Start 7-Day Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10" asChild>
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Related Features */}
        <RelatedFeatures currentFeature="/features/content-studio" />

        {/* Footer */}
        <footer className="py-12 px-4 border-t border-border">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <img src="/lovable-uploads/a3631033-2657-4c97-8fd8-079913859ab0.png" alt="Llumos - AI Search Visibility Platform" className="h-6" loading="lazy" />
              </Link>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                <Link to="/features" className="hover:text-foreground transition-colors">Features</Link>
                <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
                <Link to="/resources" className="hover:text-foreground transition-colors">Resources</Link>
                <Link to="/demo" className="hover:text-foreground transition-colors">Demo</Link>
                <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} Llumos. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
