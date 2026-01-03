import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const differentiators = [
  'Runs real prompts across ChatGPT, Gemini, and Perplexity',
  'Tracks answers over time — not one-off screenshots',
  'Shows which competitors AI actually recommends',
  'Built for SEO, content, and growth teams',
];

export function WhyLlumosDifferent() {
  return (
    <section className="py-16 md:py-24 px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      
      <div className="container max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Most Tools Guess. <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Llumos Measures.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8"
        >
          <ul className="space-y-4 mb-8">
            {differentiators.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-4 h-4 text-success" />
                </div>
                <span className="text-lg">{item}</span>
              </li>
            ))}
          </ul>

          <div className="border-t border-border/50 pt-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                <X className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-sm">
                Traditional SEO tools ≠ AI answer visibility
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
