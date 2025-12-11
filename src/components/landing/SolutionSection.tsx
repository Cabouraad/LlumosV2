import { motion } from 'framer-motion';
import { CheckCircle, BarChart3, Users, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';

const features = [
  {
    icon: BarChart3,
    title: 'Sentiment Analysis',
    description: 'Understand how AI models perceive and describe your brand.',
  },
  {
    icon: Eye,
    title: 'Share of Model Tracking',
    description: 'See how often you appear vs competitors across all major LLMs.',
  },
  {
    icon: Users,
    title: 'Competitor Spy',
    description: 'Monitor when competitors get recommended instead of you.',
  },
];

export function SolutionSection() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="container max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative order-2 lg:order-1"
          >
            {/* Glow effect */}
            <div className="absolute -inset-8 bg-gradient-to-r from-violet-500/20 via-blue-500/20 to-cyan-500/20 rounded-3xl blur-3xl opacity-50" />
            
            {/* Dashboard mockup */}
            <div className="relative bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">Llumos Dashboard</span>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'AI Score', value: '78', color: 'text-green-400' },
                    { label: 'Mentions', value: '234', color: 'text-violet-400' },
                    { label: 'Share', value: '34%', color: 'text-blue-400' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/5 rounded-lg p-3 text-center">
                      <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
                
                {/* Chart placeholder */}
                <div className="bg-white/5 rounded-lg p-4 h-40 flex items-end justify-around gap-2">
                  {[60, 80, 45, 90, 70, 85, 75].map((height, i) => (
                    <motion.div
                      key={i}
                      className="w-8 bg-gradient-to-t from-violet-500 to-blue-500 rounded-t"
                      initial={{ height: 0 }}
                      whileInView={{ height: `${height}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                    />
                  ))}
                </div>
                
                {/* Model indicators */}
                <div className="flex gap-2 flex-wrap">
                  {['ChatGPT', 'Claude', 'Gemini'].map((model) => (
                    <span key={model} className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-xs text-violet-300">
                      {model}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Features list */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-1 lg:order-2"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
              The Solution
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Your AI{' '}
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                Command Center
              </span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10">
              Llumos gives you complete visibility into how AI models perceive and recommend your brand.
            </p>

            <div className="space-y-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 group-hover:text-violet-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
