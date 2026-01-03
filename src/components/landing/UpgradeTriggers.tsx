import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const triggers = [
  {
    label: 'Curiosity',
    message: "You're missing high-intent AI answers customers use to decide.",
    cta: 'See missed prompts',
  },
  {
    label: 'Competitor Fear',
    message: 'AI is already recommending your competitor instead.',
    cta: "See why they're winning",
  },
  {
    label: 'Time Value',
    message: 'AI answers change daily — static reports fall behind.',
    cta: 'Start continuous tracking',
  },
  {
    label: 'Actionability',
    message: 'We show exactly which content and sources influence AI answers.',
    cta: 'Get optimization insights',
  },
];

export function UpgradeTriggers() {
  return (
    <section className="py-16 md:py-24 px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent" />
      
      <div className="container max-w-5xl mx-auto relative z-10">
        <div className="grid sm:grid-cols-2 gap-6">
          {triggers.map((trigger, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 hover:border-primary/30 transition-colors"
            >
              <p className="text-foreground font-medium mb-4">
                "{trigger.message}"
              </p>
              <Button
                variant="link"
                className="p-0 h-auto text-primary hover:text-primary/80 group"
                asChild
              >
                <Link to="/signup">
                  {trigger.cta}
                  <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
