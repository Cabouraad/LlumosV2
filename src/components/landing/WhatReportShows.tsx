import { motion } from 'framer-motion';
import { BarChart3, Target, Users, Link2 } from 'lucide-react';

const reportFeatures = [
  {
    icon: BarChart3,
    title: 'AI Visibility Score',
    description: 'A single score showing how often AI recommends your brand.',
  },
  {
    icon: Target,
    title: 'Winning & Missed Prompts',
    description: 'The exact questions AI answers — and where competitors appear instead.',
  },
  {
    icon: Users,
    title: 'Competitor Comparison',
    description: 'See which brands AI prefers and how often they\'re mentioned.',
  },
  {
    icon: Link2,
    title: 'Source & Citation Signals',
    description: 'Understand which websites influence AI recommendations.',
  },
];

export function WhatReportShows() {
  return (
    <section className="py-16 md:py-24 px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/20 to-transparent" />
      
      <div className="container max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            What This Report Shows
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Understand exactly how AI search engines perceive your brand
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {reportFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 hover:border-primary/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
