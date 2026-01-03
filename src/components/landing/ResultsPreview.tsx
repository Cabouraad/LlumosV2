import { motion } from 'framer-motion';
import { Check, Lock, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function ResultsPreview() {
  return (
    <section className="py-16 md:py-24 px-4 relative">
      <div className="container max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Your AI Visibility Snapshot
          </h2>
          <p className="text-lg text-muted-foreground">
            Here's a preview of what you'll discover
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Unlocked Preview Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8"
          >
            <div className="flex items-center gap-2 text-success mb-6">
              <Check className="w-5 h-5" />
              <span className="font-medium">Free Preview</span>
            </div>

            {/* Visibility Score */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Visibility Score</span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-bold text-warning">42</span>
                <span className="text-2xl text-muted-foreground mb-1">/ 100</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Room for significant improvement
              </p>
            </div>

            {/* Missed Prompt Example */}
            <div className="bg-muted/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium mb-1">Missed Prompt Example</p>
                  <p className="text-sm text-muted-foreground italic">
                    "Best [category] for [use case]"
                  </p>
                  <p className="text-xs text-destructive mt-2">
                    → Competitor is recommended instead
                  </p>
                </div>
              </div>
            </div>

            {/* AI Models Checked */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3">AI Models Checked</p>
              <div className="flex flex-wrap gap-2">
                {['ChatGPT', 'Gemini', 'Perplexity'].map((model) => (
                  <div
                    key={model}
                    className="flex items-center gap-2 px-3 py-1.5 bg-success/10 border border-success/20 rounded-full"
                  >
                    <Check className="w-3.5 h-3.5 text-success" />
                    <span className="text-sm font-medium">{model}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Competitor Teaser */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <p className="text-sm font-medium text-destructive">
                ⚠️ One competitor appears 3× more often than you
              </p>
            </div>
          </motion.div>

          {/* Locked Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative bg-card/30 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8 overflow-hidden"
          >
            {/* Blur overlay */}
            <div className="absolute inset-0 bg-background/60 backdrop-blur-md z-10" />
            
            {/* Lock icon and CTA */}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/50 border border-border flex items-center justify-center mb-6">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                Unlock Full AI Visibility Tracking
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Unlock full AI visibility tracking to see every prompt, every mention, and how to improve.
              </p>
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 border-0 shadow-lg group"
                asChild
              >
                <Link to="/signup">
                  Unlock Full AI Visibility
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>

            {/* Blurred preview content */}
            <div className="opacity-30">
              <div className="flex items-center gap-2 text-muted-foreground mb-6">
                <Lock className="w-5 h-5" />
                <span className="font-medium">Premium Features</span>
              </div>

              <div className="space-y-4">
                <div className="h-8 bg-muted/50 rounded w-3/4" />
                <div className="h-24 bg-muted/50 rounded" />
                <div className="h-8 bg-muted/50 rounded w-1/2" />
                <div className="h-32 bg-muted/50 rounded" />
                <div className="h-8 bg-muted/50 rounded w-2/3" />
              </div>

              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                <li>• Full prompt list</li>
                <li>• Prompt frequency trends</li>
                <li>• Citation source breakdown</li>
                <li>• Historical visibility tracking</li>
                <li>• Optimization recommendations</li>
                <li>• Alerts and monitoring</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
