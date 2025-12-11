import { motion } from 'framer-motion';
import { Sparkles, Zap, Brain, Bot } from 'lucide-react';

const platforms = [
  { name: 'OpenAI', icon: Zap, description: 'ChatGPT & GPT-4' },
  { name: 'Google', icon: Sparkles, description: 'Gemini & AI Overviews' },
  { name: 'Anthropic', icon: Brain, description: 'Claude' },
  { name: 'Perplexity', icon: Bot, description: 'AI Search' },
];

export function SocialProofSection() {
  return (
    <section className="py-20 px-4 relative overflow-hidden border-y border-white/5">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-950/20 via-background to-blue-950/20" />
      
      <div className="container max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h3 className="text-xl text-muted-foreground mb-2">Optimize for:</h3>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-violet-500/30 transition-all duration-300">
                <platform.icon className="w-8 h-8 text-violet-400 group-hover:text-violet-300" />
              </div>
              <h4 className="font-semibold mb-1 group-hover:text-violet-400 transition-colors">
                {platform.name}
              </h4>
              <p className="text-sm text-muted-foreground">
                {platform.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
