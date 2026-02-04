import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEOHelmet } from '@/components/SEOHelmet';
import { MarketingLayout } from '@/components/landing/MarketingLayout';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

export default function Demo() {
  return (
    <>
      <SEOHelmet
        title="Product Demo - See It in Action"
        description="Watch our demo to see how Llumos tracks your brand across ChatGPT, Gemini, and Perplexity."
        keywords="Llumos demo, AI visibility demo, ChatGPT tracking demo, brand visibility software demo"
        canonicalPath="/demo"
        ogImage="/og-demo.png"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: "Llumos Product Demo",
          description: "Comprehensive walkthrough of Llumos AI Search Visibility Platform",
          thumbnailUrl: "https://llumos.app/og-demo.png",
          uploadDate: "2024-11-01",
          embedUrl: "https://www.loom.com/embed/f37c9294260a4e039b07805c1162c1e4",
          publisher: {
            "@type": "Organization",
            name: "Llumos",
            logo: { "@type": "ImageObject", url: "https://llumos.app/lovable-uploads/a3631033-2657-4c97-8fd8-079913859ab0.png" }
          }
        }}
      />
      <MarketingLayout>
        <div className="container mx-auto px-4 py-12 pt-28">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header Section */}
            <motion.div 
              className="text-center space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20">
                <Play className="h-3 w-3 mr-1" />
                Product Demo
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                See Llumos in Action
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Watch this comprehensive walkthrough to learn how Llumos helps you track, analyze, and improve your brand's visibility across AI platforms like ChatGPT, Gemini, and Perplexity.
              </p>
            </motion.div>

            {/* Video Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="overflow-hidden border-white/10 bg-white/5 shadow-2xl shadow-violet-500/10">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src="https://www.loom.com/embed/f37c9294260a4e039b07805c1162c1e4"
                    frameBorder="0"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full"
                    title="Llumos Product Demo"
                  />
                </div>
              </Card>
            </motion.div>

            {/* Key Features Section */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              {[
                { emoji: '🎯', title: 'Track Your Brand', desc: 'Monitor how often AI platforms mention your brand in response to relevant prompts.' },
                { emoji: '📊', title: 'Analyze Competitors', desc: 'See which competitors are being recommended and understand your competitive positioning.' },
                { emoji: '💡', title: 'Get Recommendations', desc: 'Receive actionable insights to improve your visibility and outrank competitors.' }
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                >
                  <Card className="p-6 space-y-3 bg-white/5 border-white/10 hover:border-violet-500/50 transition-colors">
                    <div className="h-12 w-12 rounded-lg bg-violet-500/10 flex items-center justify-center">
                      <span className="text-2xl">{feature.emoji}</span>
                    </div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* CTA Section */}
            <motion.div 
              className="text-center space-y-4 mt-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <p className="text-xl">
                Ready to get started with Llumos?
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  asChild
                  className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 border-0 shadow-lg shadow-violet-500/25"
                >
                  <Link to="/signup">
                    Start 7-Day Free Trial
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  asChild
                >
                  <a href="https://calendly.com/llumos-info/llumos-demo" target="_blank" rel="noopener noreferrer">
                    Book a Live Demo
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </MarketingLayout>
    </>
  );
}
