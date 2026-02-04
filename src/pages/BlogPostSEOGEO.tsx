import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search, Bot, Target, BarChart3, FileText, Eye, Users, Zap, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MarketingLayout } from '@/components/landing/MarketingLayout';
import { SEOHead } from '@/components/seo/SEOHead';

// Import images
import heroImage from '@/assets/blog/seo-geo-hero.jpg';
import searchComparisonImage from '@/assets/blog/search-comparison.jpg';
import aiCitationImage from '@/assets/blog/ai-citation-example.jpg';
import dashboardImage from '@/assets/blog/llumos-dashboard.jpg';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

export default function BlogPostSEOGEO() {
  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "How Brands Win Google Search and AI Search — At the Same Time",
    "description": "Learn how to optimize your brand for both traditional SEO and AI search (GEO). A complete guide to ranking in Google and getting recommended by ChatGPT, Perplexity, and Gemini.",
    "author": {
      "@type": "Organization",
      "name": "Llumos"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Llumos",
      "logo": {
        "@type": "ImageObject",
        "url": "https://llumos.app/logo.png"
      }
    },
    "datePublished": "2026-02-04",
    "dateModified": "2026-02-04",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://llumos.app/blog/seo-geo-guide"
    }
  };

  return (
    <MarketingLayout>
      <SEOHead
        title="Win Google Search & AI Search Together"
        description="Learn how to optimize for both SEO and AI search. Rank in Google while getting recommended by ChatGPT, Perplexity, and Gemini."
        canonical="/blog/seo-geo-guide"
        ogImage="/og-seo-geo.png"
        ogType="article"
        publishedDate="2026-02-04"
        modifiedDate="2026-02-04"
        schemaJson={schemaJson}
      />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-violet-950/30 via-background to-background" />
        <div className="container max-w-4xl mx-auto relative z-10">
          <motion.div {...fadeIn} className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium bg-violet-500/10 text-violet-400 rounded-full border border-violet-500/20">
              The Complete Guide to Hybrid Search Visibility
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              How Brands Win Google Search and AI Search — At the Same Time
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Search now happens across Google, ChatGPT, Perplexity, Google AI Overviews, and Gemini. 
              Learn how to rank in traditional search while getting recommended by AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500">
                <Link to="/lp/ai-visibility">
                  Get Your AI Visibility Report
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/demo">
                  See How AI Recommends Brands
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Full-width Hero Image */}
      <section className="w-full px-4 pb-16">
        <div className="container max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          >
            <img 
              src={heroImage} 
              alt="Visualization of brand visibility across Google Search and AI platforms like ChatGPT, showing interconnected search channels"
              className="w-full h-auto"
              loading="eager"
            />
          </motion.div>
        </div>
      </section>

      {/* Section 1: The New Search Landscape */}
      <section className="py-16 px-4">
        <div className="container max-w-3xl mx-auto">
          <motion.div {...fadeIn}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              The New Search Landscape
            </h2>
            <div className="prose prose-lg prose-invert max-w-none">
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                The way people search for information has fundamentally changed. Users still turn to Google 
                for answers — but they now also ask AI assistants for recommendations, comparisons, and advice.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                When someone asks ChatGPT "What's the best project management tool?" or asks Perplexity 
                "Which CRM should I use for my startup?", they're not scanning a list of ten blue links. 
                They're receiving a single, curated answer that directly names and recommends specific brands.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                AI engines don't just list options — they <strong>summarize, compare, and recommend</strong>. 
                This means brands must now optimize for both environments: the traditional search results page 
                and the AI-generated answer.
              </p>
              <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-6 my-8">
                <p className="text-violet-300 font-medium mb-0">
                  <strong>The bottom line:</strong> If your brand isn't visible in both Google and AI search, 
                  you're only reaching half of your potential audience.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Search Comparison Image */}
      <section className="py-8 px-4">
        <div className="container max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden border border-white/10 shadow-xl"
          >
            <img 
              src={searchComparisonImage} 
              alt="Side-by-side comparison of Traditional Google Search showing 10 blue links versus AI Search showing a conversational summarized answer"
              className="w-full h-auto"
              loading="lazy"
            />
          </motion.div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Traditional search vs. AI search: Two different ways users discover brands
          </p>
        </div>
      </section>

      {/* Section 2: What Is SEO? */}
      <section className="py-16 px-4 bg-card/30">
        <div className="container max-w-3xl mx-auto">
          <motion.div {...fadeIn}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <Search className="h-6 w-6 text-blue-400" aria-hidden="true" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                What Is SEO?
              </h2>
            </div>
            <div className="prose prose-lg prose-invert max-w-none">
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Search Engine Optimization (SEO) is the practice of making your website visible and 
                authoritative in traditional search engines like Google. It's been the foundation of 
                digital marketing for over two decades.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                SEO focuses on four core pillars:
              </p>
              <ul className="space-y-3 text-muted-foreground mb-6">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 mt-1 shrink-0" aria-hidden="true" />
                  <span><strong>Keywords:</strong> Understanding what terms your audience searches for</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 mt-1 shrink-0" aria-hidden="true" />
                  <span><strong>On-page optimization:</strong> Structuring content so search engines understand it</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 mt-1 shrink-0" aria-hidden="true" />
                  <span><strong>Technical SEO:</strong> Ensuring your site loads fast, is mobile-friendly, and crawlable</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-400 mt-1 shrink-0" aria-hidden="true" />
                  <span><strong>Authority and backlinks:</strong> Building trust through links from other reputable sites</span>
                </li>
              </ul>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
                <p className="text-blue-300 font-medium mb-0">
                  <strong>SEO answers one fundamental question:</strong> Can Google find, understand, 
                  and trust your website?
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 3: What Is GEO? */}
      <section className="py-16 px-4">
        <div className="container max-w-3xl mx-auto">
          <motion.div {...fadeIn}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <Bot className="h-6 w-6 text-violet-400" aria-hidden="true" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                What Is GEO (Generative Engine Optimization)?
              </h2>
            </div>
            <div className="prose prose-lg prose-invert max-w-none">
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Generative Engine Optimization (GEO) is the practice of optimizing your brand to be 
                recommended, cited, and featured in AI-generated responses. Unlike SEO, where you compete 
                for ranking positions, GEO is about being <strong>chosen</strong> as the answer.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                AI engines work differently than traditional search:
              </p>
              <ul className="space-y-3 text-muted-foreground mb-6">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-violet-400 mt-1 shrink-0" aria-hidden="true" />
                  <span><strong>They don't rank pages</strong> — they choose sources to cite and synthesize</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-violet-400 mt-1 shrink-0" aria-hidden="true" />
                  <span><strong>Visibility depends on being cited</strong> — not just indexed</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-violet-400 mt-1 shrink-0" aria-hidden="true" />
                  <span><strong>Semantic relevance matters more</strong> than keyword density</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-violet-400 mt-1 shrink-0" aria-hidden="true" />
                  <span><strong>AI recommendations directly influence</strong> buying decisions</span>
                </li>
              </ul>
              <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-6">
                <p className="text-violet-300 font-medium mb-0">
                  <strong>GEO answers one fundamental question:</strong> Is your brand chosen and cited 
                  when AI answers questions in your category?
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* AI Citation Image */}
      <section className="py-8 px-4">
        <div className="container max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden border border-white/10 shadow-xl"
          >
            <img 
              src={aiCitationImage} 
              alt="AI chatbot interface showing a brand recommendation with cited sources, demonstrating how AI platforms choose and highlight specific brands"
              className="w-full h-auto"
              loading="lazy"
            />
          </motion.div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            How AI platforms cite and recommend brands in their responses
          </p>
        </div>
      </section>

      {/* Section 4: Why SEO Alone Is No Longer Enough */}
      <section className="py-16 px-4 bg-card/30">
        <div className="container max-w-3xl mx-auto">
          <motion.div {...fadeIn}>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Why SEO Alone Is No Longer Enough
            </h2>
            <div className="prose prose-lg prose-invert max-w-none">
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                Here's the uncomfortable truth: your brand can rank #1 on Google and still be 
                completely invisible in AI search. We've seen it happen repeatedly.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                A competitor with weaker SEO — fewer backlinks, lower domain authority — can 
                dominate AI recommendations simply because their content is structured in ways 
                AI models prefer to cite.
              </p>
              <div className="grid md:grid-cols-3 gap-4 my-8">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
                  <p className="text-red-300 font-medium text-sm mb-2">The Silent Risk</p>
                  <p className="text-muted-foreground text-sm">
                    AI traffic loss is invisible in traditional analytics. You won't see it happening.
                  </p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
                  <p className="text-amber-300 font-medium text-sm mb-2">The Competitive Gap</p>
                  <p className="text-muted-foreground text-sm">
                    Competitors are already optimizing for AI. Every day you wait, the gap widens.
                  </p>
                </div>
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-5">
                  <p className="text-violet-300 font-medium text-sm mb-2">The Buying Shift</p>
                  <p className="text-muted-foreground text-sm">
                    More buyers ask AI for recommendations before they ever search Google.
                  </p>
                </div>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                The brands that thrive in the next era of search will be those that master 
                both channels simultaneously — not those who wait to see how things play out.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 5: How Llumos Solves SEO + GEO Together */}
      <section className="py-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <motion.div {...fadeIn}>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How Llumos Solves SEO + GEO Together
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Llumos is a unified visibility platform that helps you win in both traditional 
                search and AI search — with one dashboard, one strategy, one solution.
              </p>
            </div>

            <div className="space-y-8">
              {/* Feature 1 */}
              <div className="bg-card/50 border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <Target className="h-5 w-5 text-violet-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold">1. Monitor the Prompts That Matter</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Track real AI prompts with buying intent in your category. See exactly where 
                  your brand appears, where competitors show up, and where gaps exist.
                </p>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden="true" />
                    Monitor prompts across ChatGPT, Perplexity, Gemini, and more
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden="true" />
                    Identify high-intent queries where you're not being recommended
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden="true" />
                    Track changes over time as AI models update
                  </li>
                </ul>
              </div>

              {/* Feature 2 */}
              <div className="bg-card/50 border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Eye className="h-5 w-5 text-blue-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold">2. Identify Citations in AI Responses</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  See which sources AI engines actually cite in their answers. Understand why 
                  competitors are being recommended and what content drives citations.
                </p>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden="true" />
                    Track citations across all major AI platforms
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden="true" />
                    Analyze competitor citation patterns
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden="true" />
                    Discover which content types get cited most
                  </li>
                </ul>
              </div>

              {/* Feature 3 */}
              <div className="bg-card/50 border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <FileText className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold">3. Create Content Optimized for SEO and GEO</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Build content that ranks in Google and gets cited by AI. Focus on semantic 
                  coverage and structure that AI models can summarize and reference.
                </p>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden="true" />
                    Semantic coverage over keyword stuffing
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden="true" />
                    Content structured for AI summarization
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden="true" />
                    One strategy that works for both channels
                  </li>
                </ul>
              </div>

              {/* Feature 4 */}
              <div className="bg-card/50 border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <BarChart3 className="h-5 w-5 text-amber-400" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold">4. Unified Visibility Monitoring</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Track your entire search presence — traditional and AI — from one dashboard. 
                  Get a single visibility score that shows where you stand.
                </p>
                <ul className="space-y-2 text-muted-foreground text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden="true" />
                    One dashboard for all search channels
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden="true" />
                    Unified visibility score
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden="true" />
                    Continuous monitoring as AI evolves
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Dashboard Image */}
      <section className="py-8 px-4">
        <div className="container max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          >
            <img 
              src={dashboardImage} 
              alt="Llumos analytics dashboard showing brand visibility score, competitor analysis charts, and AI platform breakdown metrics"
              className="w-full h-auto"
              loading="lazy"
            />
          </motion.div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            The Llumos dashboard: unified visibility tracking across all search channels
          </p>
        </div>
      </section>

      {/* Section 6: Who Llumos Is For */}
      <section className="py-16 px-4 bg-card/30">
        <div className="container max-w-3xl mx-auto">
          <motion.div {...fadeIn}>
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
              Who Llumos Is For
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-card/50 border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="h-5 w-5 text-violet-400" aria-hidden="true" />
                  <h3 className="font-bold">SaaS Companies</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Competing in crowded categories where AI recommendations directly influence buying decisions.
                </p>
              </div>
              <div className="bg-card/50 border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Search className="h-5 w-5 text-blue-400" aria-hidden="true" />
                  <h3 className="font-bold">Brands Investing in SEO</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Already ranking well on Google but want to protect and extend that advantage into AI search.
                </p>
              </div>
              <div className="bg-card/50 border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="h-5 w-5 text-amber-400" aria-hidden="true" />
                  <h3 className="font-bold">Marketing Teams</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Focused on future-proof growth and building sustainable visibility across all channels.
                </p>
              </div>
              <div className="bg-card/50 border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Bot className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                  <h3 className="font-bold">Founders</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Who understand that being recommended by AI is becoming as important as ranking on Google.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-4">
        <div className="container max-w-3xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              The Future of Search Is Hybrid
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Brands that win will be visible in both Google and AI search. 
              Llumos gives you the tools to monitor, optimize, and grow across both channels — together.
            </p>
            <Button size="lg" asChild className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-lg shadow-violet-500/25">
              <Link to="/lp/ai-visibility">
                Get Your AI Visibility Report
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
    </MarketingLayout>
  );
}
