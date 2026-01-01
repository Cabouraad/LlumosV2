import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { 
  Eye, 
  Users, 
  MessageSquare, 
  Lightbulb, 
  CheckCircle2,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AudienceToggle } from "@/components/landing/AudienceToggle";
import { useAudienceToggle } from "@/hooks/useAudienceToggle";

const audienceContent = {
  marketing: {
    previewSubtitle: "See how AI search affects your brand and where to focus next.",
    analyzingItems: [
      "Which prompts AI uses to recommend brands like yours",
      "Where your brand appears — and where it doesn't",
      "Which competitors AI prefers and why",
      "The sources and citations influencing AI answers",
      "Opportunities to improve visibility",
    ],
  },
  agency: {
    previewSubtitle: "See how AI search treats your client and how to explain the gap.",
    analyzingItems: [
      "Which prompts AI uses to recommend brands like your client's",
      "Where the client brand appears — and where it doesn't",
      "Which competitors AI prefers and why",
      "The sources and citations influencing AI answers",
      "Client-ready insights to support your recommendations",
    ],
  },
};

const AIRecommendsThankYou = () => {
  const [dots, setDots] = useState(1);
  const [audience, setAudience] = useAudienceToggle();

  const content = audienceContent[audience];

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev % 3) + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const previewCards = [
    { icon: Eye, title: "AI Visibility Overview" },
    { icon: Users, title: "Competitor Comparison" },
    { icon: MessageSquare, title: "Prompt-Level Insights" },
    { icon: Lightbulb, title: "Actionable Recommendations" },
  ];

  return (
    <>
      <Helmet>
        <title>Your Snapshot Is Being Prepared | Llumos</title>
        <meta
          name="description"
          content="We're analyzing AI search engines to prepare your AI Visibility Snapshot."
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-[#0a0a0f] text-white">
        {/* Subtle background gradient */}
        <div className="fixed inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-blue-900/10 pointer-events-none" />
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10">
          {/* Header */}
          <header className="py-6 px-6">
            <div className="max-w-4xl mx-auto">
              <Link to="/" className="inline-flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <span className="text-xl font-semibold">Llumos</span>
              </Link>
            </div>
          </header>

          {/* Hero Section */}
          <section className="py-16 px-6">
            <div className="max-w-3xl mx-auto text-center">
              {/* Audience Toggle */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex justify-center mb-8"
              >
                <AudienceToggle audience={audience} onChange={setAudience} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                key={audience}
              >
                {/* Success indicator */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-8">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>

                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
                  Your AI Visibility Snapshot Is Being Prepared
                </h1>

                <p className="text-lg md:text-xl text-gray-400 mb-4 max-w-2xl mx-auto">
                  We're analyzing how AI search engines like ChatGPT, Gemini, and 
                  Perplexity respond to real prompts in your category.
                </p>

                <p className="text-base text-gray-500 mb-10 max-w-2xl mx-auto">
                  {content.previewSubtitle}
                </p>

                {/* Progress indicator */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full ${
                          i <= dots ? "bg-purple-400" : "bg-gray-700"
                        }`}
                        animate={{ scale: i === dots ? 1.2 : 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    ))}
                  </div>
                  <span className="text-gray-500 text-sm">Analyzing</span>
                </div>
              </motion.div>
            </div>
          </section>

          {/* What We're Analyzing */}
          <section className="py-12 px-6">
            <div className="max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                key={audience}
              >
                <h2 className="text-xl md:text-2xl font-semibold mb-6 text-center">
                  What We're Looking At
                </h2>

                <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                  <CardContent className="p-6 md:p-8">
                    <ul className="space-y-4">
                      {content.analyzingItems.map((item, index) => (
                        <motion.li
                          key={index}
                          className="flex items-start gap-3"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2.5 shrink-0" />
                          <span className="text-gray-300">{item}</span>
                        </motion.li>
                      ))}
                    </ul>

                    <p className="text-sm text-gray-500 mt-6 pt-6 border-t border-white/10">
                      This analysis is based on real AI responses — not assumptions.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>

          {/* What You'll See */}
          <section className="py-12 px-6">
            <div className="max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <h2 className="text-xl md:text-2xl font-semibold mb-8 text-center">
                  What You'll See in Your Snapshot
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {previewCards.map((card, index) => (
                    <Card
                      key={index}
                      className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/[0.07] transition-colors"
                    >
                      <CardContent className="p-5 text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/20 mb-3">
                          <card.icon className="w-5 h-5 text-purple-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-200">
                          {card.title}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <p className="text-center text-gray-500 text-sm mt-6">
                  Clear insights you can act on immediately.
                </p>
              </motion.div>
            </div>
          </section>

          {/* Delivery Explanation */}
          <section className="py-12 px-6">
            <div className="max-w-3xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/20 border-purple-500/20">
                  <CardContent className="p-6 md:p-8">
                    <h2 className="text-xl font-semibold mb-4">
                      When Will I See My Results?
                    </h2>

                    <p className="text-gray-300 mb-5">
                      Your AI Visibility Snapshot will be available shortly.
                    </p>

                    <p className="text-gray-400 mb-4">You'll be able to view:</p>

                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        Your AI visibility across platforms
                      </li>
                      <li className="flex items-center gap-2 text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        Competitive gaps
                      </li>
                      <li className="flex items-center gap-2 text-gray-300">
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        Clear next steps to improve
                      </li>
                    </ul>

                    <p className="text-gray-400 text-sm">
                      We'll notify you as soon as it's ready.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>

          {/* Optional Soft CTA */}
          <section className="py-12 px-6">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <h3 className="text-lg font-medium mb-3 text-gray-200">
                  Want to Go Deeper?
                </h3>

                <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                  Llumos also offers ongoing AI visibility tracking and optimization — 
                  but for now, start with your snapshot.
                </p>

                <Button
                  variant="outline"
                  className="border-white/20 text-gray-300 hover:bg-white/10 hover:text-white"
                  asChild
                >
                  <Link to="/">
                    Learn How Llumos Works
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </motion.div>
            </div>
          </section>

          {/* Reassurance Footer */}
          <footer className="py-16 px-6 border-t border-white/5">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-gray-500 text-sm leading-relaxed">
                No demo required.<br />
                No sales outreach.<br />
                Built for marketers who want clarity.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
};

export default AIRecommendsThankYou;
