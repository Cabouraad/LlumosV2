import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SEOHelmet } from '@/components/SEOHelmet';
import { MarketingLayout } from '@/components/landing/MarketingLayout';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Search, 
  Bot, 
  Target, 
  BarChart3, 
  Link2, 
  FileText, 
  Eye, 
  Users, 
  CheckCircle2,
  X,
  Zap,
  TrendingUp,
  MessageSquare,
  Quote
} from 'lucide-react';

import heroImage from '@/assets/blog/seo-vs-geo-hero.jpg';
import seoAnalyticsImage from '@/assets/blog/seo-analytics-classic.jpg';
import aiCitationImage from '@/assets/blog/ai-citation-sources.jpg';
import dashboardImage from '@/assets/blog/llumos-unified-dashboard.jpg';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

const BlogPostSEOvsGEO = () => {
  return (
    <MarketingLayout>
      <SEOHelmet
        title="SEO Tools vs AI Visibility Tools: What Actually Drives Discovery Today"
        description="Understand the difference between traditional SEO tools and AI visibility (GEO) tools. Learn why brands need both to stay visible in Google and AI search."
        canonicalPath="/blog/seo-tools-vs-ai-visibility-tools"
        schemaType="Article"
      />

      <article className="min-h-screen">
        {/* Hero Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div {...fadeIn} className="text-center mb-12">
              <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5">
                Comparison Guide
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                SEO Tools vs AI Visibility Tools: What Actually Drives Discovery Today
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Search now happens in both Google and AI tools like ChatGPT, Perplexity, Google AI Overviews, and Gemini. 
                Understanding what each tool category measures is essential for modern visibility.
              </p>

              <Button size="lg" asChild>
                <Link to="/signup" className="flex items-center gap-2">
                  See How AI Recommends Brands
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
            </motion.div>

            {/* Hero Image */}
            <motion.div 
              {...fadeIn}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="rounded-2xl overflow-hidden shadow-2xl"
            >
              <img
                src={heroImage}
                alt="Comparison of SEO tools and AI visibility tools showing the evolution of search"
                className="w-full h-auto"
                loading="eager"
              />
            </motion.div>
          </div>
        </section>

        {/* Section 1: Why This Comparison Matters */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div {...fadeIn}>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Why This Comparison Matters
              </h2>
              
              <div className="prose prose-lg max-w-none text-foreground">
                <p className="text-lg text-muted-foreground mb-6">
                  SEO tools were built for a world where search meant blue links on a results page. 
                  They excel at tracking rankings, monitoring backlinks, and analyzing keyword performance in traditional search engines.
                </p>

                <p className="text-lg text-muted-foreground mb-6">
                  But AI search has fundamentally changed how users discover brands. When someone asks ChatGPT 
                  for a product recommendation or uses Perplexity to research solutions, the answer isn't a list of links — 
                  it's a curated response that directly names and recommends specific brands.
                </p>

                <Card className="bg-primary/5 border-primary/20 mb-6">
                  <CardContent className="p-6">
                    <p className="text-foreground font-medium">
                      Most teams assume their SEO tools cover AI search visibility. They don't. 
                      This creates a growing blind spot as more buyer research moves to AI platforms.
                    </p>
                  </CardContent>
                </Card>

                <p className="text-lg text-muted-foreground">
                  This comparison isn't about replacing SEO — it's about adding visibility where decisions are now happening.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 2: What SEO Tools Are Designed to Do */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div {...fadeIn}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-accent/10">
                  <Search className="h-6 w-6 text-accent-foreground" aria-hidden="true" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  What SEO Tools Are Designed to Do
                </h2>
              </div>
              
              <p className="text-lg text-muted-foreground mb-8">
                Traditional SEO tools have been essential for digital marketing success. They focus on:
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {[
                  { icon: TrendingUp, title: 'Keyword Rankings', desc: 'Track where your pages rank for target keywords' },
                  { icon: Link2, title: 'Backlinks & Authority', desc: 'Monitor link profiles and domain authority' },
                  { icon: FileText, title: 'Technical SEO', desc: 'Audit site speed, crawlability, and structure' },
                  { icon: Target, title: 'On-Page Optimization', desc: 'Analyze titles, meta tags, and content' },
                  { icon: BarChart3, title: 'Organic Traffic', desc: 'Measure visits from search engine results' },
                ].map((item, index) => (
                  <Card key={index} className="bg-card/50">
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <item.icon className="h-5 w-5 text-accent-foreground" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-accent/5 border-accent/20 mb-10">
                <CardContent className="p-6">
                  <p className="text-foreground">
                    <strong>SEO tools answer:</strong> "How does my site perform in Google's traditional search results?"
                  </p>
                </CardContent>
              </Card>

              {/* SEO Analytics Image */}
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <img
                  src={seoAnalyticsImage}
                  alt="Classic SEO analytics dashboard showing keyword rankings and backlink metrics"
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 3: Where SEO Tools Fall Short */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div {...fadeIn}>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Where SEO Tools Fall Short
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8">
                SEO tools excel at what they were built for. But they weren't built for AI search.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  "SEO tools don't monitor what questions users ask AI assistants",
                  "They don't track which sources AI engines cite in responses",
                  "They can't show which brands AI actively recommends",
                  "They don't explain why competitors appear in AI-generated answers",
                  "They have no visibility into AI summarization and synthesis"
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-muted mt-1">
                      <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <p className="text-foreground">{item}</p>
                  </div>
                ))}
              </div>

              <Card className="bg-warning/5 border-warning/20">
                <CardContent className="p-6">
                  <p className="text-foreground">
                    This isn't a failure of SEO tools — it's a visibility gap that requires a new category of measurement.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Section 4: What AI Visibility (GEO) Tools Are Designed to Do */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div {...fadeIn}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Bot className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  What AI Visibility (GEO) Tools Are Designed to Do
                </h2>
              </div>
              
              <p className="text-lg text-muted-foreground mb-8">
                AI Visibility tools — also called GEO (Generative Engine Optimization) tools — represent a new category 
                built specifically to measure and improve brand presence in AI-generated answers.
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {[
                  { icon: MessageSquare, title: 'Prompt-Level Monitoring', desc: 'Track real questions users ask AI tools' },
                  { icon: Quote, title: 'Brand Mentions', desc: 'See when and how AI names your brand' },
                  { icon: Link2, title: 'Citation Tracking', desc: 'Monitor which sources AI platforms cite' },
                  { icon: Eye, title: 'Semantic Relevance', desc: 'Measure content alignment with AI understanding' },
                  { icon: Target, title: 'Recommendation Positioning', desc: 'Track where you appear in AI suggestions' },
                ].map((item, index) => (
                  <Card key={index} className="bg-card/50">
                    <CardContent className="p-4 flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-primary/5 border-primary/20 mb-10">
                <CardContent className="p-6">
                  <p className="text-foreground">
                    <strong>AI visibility tools answer:</strong> "Is my brand being chosen when AI answers questions?"
                  </p>
                </CardContent>
              </Card>

              {/* AI Citation Image */}
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <img
                  src={aiCitationImage}
                  alt="AI assistant interface showing cited sources and brand recommendations"
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 5: Comparison Table */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div {...fadeIn}>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 text-center">
                SEO Tools vs AI Visibility Tools
              </h2>
              
              <p className="text-lg text-muted-foreground mb-10 text-center max-w-2xl mx-auto">
                A clear comparison of what each tool category measures and monitors.
              </p>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-4 font-semibold text-foreground">Capability</th>
                        <th className="text-center p-4 font-semibold text-accent-foreground">
                          <div className="flex items-center justify-center gap-2">
                            <Search className="h-4 w-4" aria-hidden="true" />
                            SEO Tools
                          </div>
                        </th>
                        <th className="text-center p-4 font-semibold text-primary">
                          <div className="flex items-center justify-center gap-2">
                            <Bot className="h-4 w-4" aria-hidden="true" />
                            AI Visibility Tools
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { capability: 'Keyword ranking tracking', seo: true, ai: false },
                        { capability: 'Backlink monitoring', seo: true, ai: false },
                        { capability: 'Google SERP positions', seo: true, ai: false },
                        { capability: 'Technical site audits', seo: true, ai: false },
                        { capability: 'AI prompt tracking', seo: false, ai: true },
                        { capability: 'AI citation monitoring', seo: false, ai: true },
                        { capability: 'Brand recommendation tracking', seo: false, ai: true },
                        { capability: 'Competitive AI visibility', seo: false, ai: true },
                        { capability: 'Visibility inside AI summaries', seo: false, ai: true },
                        { capability: 'Cross-platform AI monitoring', seo: false, ai: true },
                      ].map((row, index) => (
                        <tr key={index} className="border-b last:border-0">
                          <td className="p-4 text-foreground">{row.capability}</td>
                          <td className="p-4 text-center">
                            {row.seo ? (
                              <CheckCircle2 className="h-5 w-5 text-accent-foreground mx-auto" aria-label="Yes" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground/50 mx-auto" aria-label="No" />
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {row.ai ? (
                              <CheckCircle2 className="h-5 w-5 text-primary mx-auto" aria-label="Yes" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground/50 mx-auto" aria-label="No" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <Card className="bg-accent/5 border-accent/20">
                  <CardContent className="p-6 text-center">
                    <Search className="h-8 w-8 text-accent-foreground mx-auto mb-3" aria-hidden="true" />
                    <p className="text-foreground font-medium">
                      SEO tools dominate traditional search visibility
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-6 text-center">
                    <Bot className="h-8 w-8 text-primary mx-auto mb-3" aria-hidden="true" />
                    <p className="text-foreground font-medium">
                      AI visibility tools dominate AI search visibility
                    </p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 6: Where Llumos Fits */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div {...fadeIn}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  Where Llumos Fits
                </h2>
              </div>
              
              <p className="text-lg text-muted-foreground mb-8">
                Llumos bridges both worlds — providing comprehensive visibility across traditional search and AI search 
                through a single, unified platform.
              </p>

              <div className="grid gap-4 mb-10">
                {[
                  { title: 'Monitor AI prompts with buying intent', desc: 'Track the questions that lead to purchase decisions' },
                  { title: 'Track citations and brand mentions', desc: 'See when AI platforms reference your brand or content' },
                  { title: 'Identify AI visibility gaps', desc: 'Discover where competitors appear and you don\'t' },
                  { title: 'Create content optimized for SEO and GEO', desc: 'Build assets that perform in both channels' },
                  { title: 'One unified visibility strategy', desc: 'Stop managing disconnected tools and metrics' },
                ].map((item, index) => (
                  <Card key={index} className="bg-card/50">
                    <CardContent className="p-4 flex items-start gap-4">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                      <div>
                        <h3 className="font-semibold text-foreground">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Dashboard Image */}
              <div className="rounded-2xl overflow-hidden shadow-xl">
                <img
                  src={dashboardImage}
                  alt="Llumos unified dashboard showing both SEO and AI visibility metrics"
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Section 7: Who Needs AI Visibility Tools */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div {...fadeIn}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  Who Needs AI Visibility Tools
                </h2>
              </div>
              
              <p className="text-lg text-muted-foreground mb-8">
                AI visibility tools are especially valuable for:
              </p>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {[
                  { title: 'Brands already ranking on Google', desc: 'You\'ve invested in SEO — now extend that investment to AI' },
                  { title: 'Competitive SaaS markets', desc: 'Where AI recommendations directly influence evaluations' },
                  { title: 'High-consideration categories', desc: 'Products where buyers research extensively before deciding' },
                  { title: 'Teams seeing competitor AI mentions', desc: 'When competitors appear in AI answers and you don\'t' },
                ].map((item, index) => (
                  <Card key={index} className="bg-card">
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <p className="text-foreground">
                    AI visibility is additive, not a replacement. The most effective teams use both SEO and AI visibility tools together.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <motion.div {...fadeIn}>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                SEO Shows Rankings. AI Visibility Shows Recommendations.
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8">
                See where your brand appears when AI answers the questions that matter to your buyers.
              </p>

              <Button size="lg" asChild>
                <Link to="/signup" className="flex items-center gap-2">
                  Get Your AI Visibility Report
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>
      </article>
    </MarketingLayout>
  );
};

export default BlogPostSEOvsGEO;
