import { motion } from 'framer-motion';
import { TrendingUp, EyeOff, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';

const problems = [
  {
    icon: TrendingUp,
    title: 'Traffic Shift',
    description: '60% of search traffic is moving to LLMs.',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    icon: EyeOff,
    title: 'The Blindspot',
    description: "Traditional SEO tools can't see inside AI models.",
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: AlertTriangle,
    title: 'Hallucinations',
    description: 'AI might be quoting wrong prices for your product.',
    gradient: 'from-amber-500 to-orange-500',
  },
];

export function ProblemSection() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-violet-950/10 to-background" />
      
      <div className="container max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-4">
            The Problem
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            The SEO Era is{' '}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              Ending
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            While you're optimizing for Google, your customers are asking AI for recommendations.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problems.map((problem, index) => (
            <motion.div
              key={problem.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="relative group h-full p-8 bg-card/50 backdrop-blur-sm border-white/5 hover:border-violet-500/30 transition-all duration-500 overflow-hidden">
                {/* Hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-blue-500/0 group-hover:from-violet-500/5 group-hover:to-blue-500/5 transition-all duration-500" />
                
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${problem.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <problem.icon className="w-7 h-7 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3 group-hover:text-violet-400 transition-colors">
                    {problem.title}
                  </h3>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {problem.description}
                  </p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
