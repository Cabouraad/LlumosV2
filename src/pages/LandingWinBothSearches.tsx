import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Bot, TrendingUp, Eye, BarChart3, Target, Users } from "lucide-react";
import { SEOHelmet } from "@/components/SEOHelmet";

import heroImage from "@/assets/blog/win-both-searches-hero.jpg";
import comparisonImage from "@/assets/blog/search-comparison-visual.jpg";
import dashboardImage from "@/assets/blog/llumos-unified-dashboard.jpg";

const LandingWinBothSearches = () => {
  return (
    <>
      <SEOHelmet
        title="How Brands Win Google Search and AI Search — At the Same Time"
        description="Customers search Google and ask AI which brands to trust. Llumos shows where your brand appears, where competitors win, and how to improve visibility across both."
        canonicalPath="/win-google-and-ai-search"
      />

      <div className="min-h-screen bg-background text-foreground">
        {/* Hero Section */}
        <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              How Brands Win Google Search and AI Search —{" "}
              <span className="text-primary">At the Same Time</span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              Customers still search Google — but they're also asking AI tools which brands to trust.
              Llumos shows you where your brand appears, where competitors win, and how to improve visibility across both.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button asChild size="lg" className="text-lg px-8 py-6">
                <Link to="/request-visibility-report">
                  Get Your AI Visibility Report
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
                <Link to="/demo">
                  See How AI Recommends Brands
                </Link>
              </Button>
            </div>
          </div>

          <div className="max-w-5xl mx-auto">
            <img
              src={heroImage}
              alt="Unified view of Google search rankings and AI recommendations"
              className="w-full rounded-xl shadow-2xl border border-border/50"
              loading="eager"
            />
          </div>
        </section>

        {/* Search Has Changed */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 text-center">
              Search Has Changed
            </h2>
            
            <div className="space-y-6 text-lg text-muted-foreground">
              <p>
                <strong className="text-foreground">Google rankings still matter.</strong> Organic traffic remains a core acquisition channel for most brands.
              </p>
              <p>
                <strong className="text-foreground">But AI tools now influence buying decisions.</strong> ChatGPT, Perplexity, Gemini, and Google AI Overviews are changing how customers discover and choose brands.
              </p>
              <p>
                <strong className="text-foreground">AI doesn't show 10 blue links.</strong> It recommends a few trusted brands — and explains why.
              </p>
            </div>

            <div className="mt-10 p-6 bg-primary/10 border border-primary/20 rounded-xl">
              <p className="text-xl font-semibold text-center text-foreground">
                If your brand isn't showing up in AI answers, you're invisible where decisions are happening.
              </p>
            </div>
          </div>

          <div className="max-w-5xl mx-auto mt-12">
            <img
              src={comparisonImage}
              alt="Visual comparison of traditional Google search results versus AI-generated recommendations"
              className="w-full rounded-xl shadow-xl border border-border/50"
              loading="lazy"
            />
          </div>
        </section>

        {/* SEO ≠ AI Visibility */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-12 text-center">
              SEO ≠ AI Visibility
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 bg-muted/50 rounded-xl border border-border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-secondary/20 rounded-lg">
                    <Search className="h-6 w-6 text-secondary-foreground" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold">SEO Helps You</h3>
                </div>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    Rank pages in search results
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    Capture organic search traffic
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    Improve site authority
                  </li>
                </ul>
              </div>

              <div className="p-8 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <Bot className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold">AI Visibility Determines</h3>
                </div>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    Whether your brand is cited
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    Whether you're recommended
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    Whether competitors replace you
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Why Most Brands Lose AI Search */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-8 text-center">
              Why Most Brands Lose AI Search
            </h2>

            <div className="space-y-6 text-lg">
              <div className="flex items-start gap-4 p-6 bg-background rounded-xl border border-border">
                <div className="p-2 bg-destructive/10 rounded-lg shrink-0">
                  <Eye className="h-5 w-5 text-destructive" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">SEO tools don't track AI prompts</p>
                  <p className="text-muted-foreground mt-1">Traditional analytics can't see what AI engines recommend.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 bg-background rounded-xl border border-border">
                <div className="p-2 bg-destructive/10 rounded-lg shrink-0">
                  <Users className="h-5 w-5 text-destructive" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Brands don't know when competitors are recommended</p>
                  <p className="text-muted-foreground mt-1">Competitors may be capturing AI mindshare without you knowing.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-6 bg-background rounded-xl border border-border">
                <div className="p-2 bg-destructive/10 rounded-lg shrink-0">
                  <TrendingUp className="h-5 w-5 text-destructive" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">AI traffic loss happens silently</p>
                  <p className="text-muted-foreground mt-1">You can't fix what you can't measure.</p>
                </div>
              </div>
            </div>

            <p className="text-center text-lg text-muted-foreground mt-10">
              <strong className="text-foreground">This is a measurement problem, not a content problem.</strong>
            </p>
          </div>
        </section>

        {/* How Llumos Fixes This */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-center">
              How Llumos Fixes This
            </h2>
            <p className="text-xl text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              A unified SEO + AI visibility platform that shows you the complete picture.
            </p>

            <div className="grid sm:grid-cols-2 gap-6 mb-12">
              <div className="p-8 bg-muted/50 rounded-xl border border-border hover:border-primary/30 transition-colors">
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                  <Search className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold mb-2">Monitor AI Prompts</h3>
                <p className="text-muted-foreground">
                  Track real questions people ask AI when choosing products.
                </p>
              </div>

              <div className="p-8 bg-muted/50 rounded-xl border border-border hover:border-primary/30 transition-colors">
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                  <Eye className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold mb-2">See AI Citations</h3>
                <p className="text-muted-foreground">
                  Identify which sources and brands AI engines trust.
                </p>
              </div>

              <div className="p-8 bg-muted/50 rounded-xl border border-border hover:border-primary/30 transition-colors">
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                  <Target className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold mb-2">Optimize for SEO + GEO</h3>
                <p className="text-muted-foreground">
                  Create content that ranks and gets cited.
                </p>
              </div>

              <div className="p-8 bg-muted/50 rounded-xl border border-border hover:border-primary/30 transition-colors">
                <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold mb-2">Track Visibility Over Time</h3>
                <p className="text-muted-foreground">
                  See gains, losses, and competitive shifts.
                </p>
              </div>
            </div>

            <img
              src={dashboardImage}
              alt="Llumos unified dashboard showing AI visibility metrics and prompt tracking"
              className="w-full rounded-xl shadow-xl border border-border/50"
              loading="lazy"
            />
          </div>
        </section>

        {/* Who This Is For */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold mb-10 text-center">
              Who This Is For
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "SaaS and tech companies",
                "Brands competing in crowded categories",
                "Teams already investing in SEO",
                "Marketers noticing competitors mentioned by AI"
              ].map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-5 bg-background rounded-xl border border-border"
                >
                  <div className="p-2 bg-primary/10 rounded-full">
                    <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-primary/5 border-t border-primary/10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              AI Is Already Recommending Brands.
              <br />
              <span className="text-primary">Make Sure Yours Is One of Them.</span>
            </h2>

            <Button asChild size="lg" className="text-lg px-10 py-7 mt-4">
              <Link to="/request-visibility-report">
                Get Your AI Visibility Report
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
};

export default LandingWinBothSearches;
