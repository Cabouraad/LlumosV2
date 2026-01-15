import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { 
  CheckCircle2,
  ArrowRight,
  Mail,
  Clock,
  Eye,
  Users,
  MessageSquare,
  Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GoogleAdsTracking } from "@/components/tracking/GoogleAdsTracking";

const previewCards = [
  { icon: Eye, title: "AI Visibility Score" },
  { icon: Users, title: "Competitor Comparison" },
  { icon: MessageSquare, title: "Prompt-Level Insights" },
  { icon: Lightbulb, title: "Actionable Recommendations" },
];

export default function AIVisibilityThankYou() {
  return (
    <>
      <GoogleAdsTracking />
      <Helmet>
        <title>Thank You | Your AI Visibility Report Is On Its Way | Llumos</title>
        <meta
          name="description"
          content="Thank you for requesting your AI Visibility Report. Check your inbox shortly."
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="py-6 px-4">
          <div className="container max-w-6xl mx-auto">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">L</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Llumos
              </span>
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-16 md:py-24 px-4">
          <div className="container max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Success indicator */}
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/20 mb-8">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                Thank You! Your Report Is On Its Way
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                We're analyzing how AI search engines like ChatGPT, Gemini, and 
                Perplexity respond to prompts in your category.
              </p>

              {/* Email notification card */}
              <Card className="bg-card border border-border mb-12 max-w-md mx-auto">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Check your inbox</p>
                      <p className="text-sm text-muted-foreground">
                        Your AI Visibility Report will arrive shortly
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* What You'll See */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="container max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-xl md:text-2xl font-semibold mb-8 text-center">
                What You'll See in Your Report
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {previewCards.map((card, index) => (
                  <Card
                    key={index}
                    className="bg-card border border-border hover:border-primary/30 transition-colors"
                  >
                    <CardContent className="p-5 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-3">
                        <card.icon className="w-6 h-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium">
                        {card.title}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2 mt-8 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <p className="text-sm">
                  Reports are typically delivered within a few minutes
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* What's Next */}
        <section className="py-16 px-4">
          <div className="container max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold mb-4">
                    What Happens Next?
                  </h2>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                      <span>We run real prompts across ChatGPT, Gemini, and Perplexity</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                      <span>We analyze where your brand appears (or doesn't)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                      <span>You get a clear snapshot with actionable insights</span>
                    </li>
                  </ul>

                  <p className="text-sm text-muted-foreground">
                    No demo required. No sales outreach. Just clarity on your AI visibility.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 px-4">
          <div className="container max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <h3 className="text-lg font-medium mb-3">
                Want to Learn More While You Wait?
              </h3>

              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Discover how leading brands are optimizing for AI search visibility.
              </p>

              <Button variant="outline" asChild>
                <Link to="/">
                  Explore Llumos
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-4 border-t border-border">
          <div className="container max-w-3xl mx-auto text-center">
            <p className="text-sm text-muted-foreground">
              Questions? Reach out to us at{" "}
              <a href="mailto:support@llumos.app" className="text-primary hover:underline">
                support@llumos.app
              </a>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
