import { motion } from 'framer-motion';
import { Link2, Activity, Lightbulb } from 'lucide-react';

const steps = [
  {
    icon: Link2,
    title: 'Connect Your Brand',
    description: 'Add your website and key details. Takes under 2 minutes.',
  },
  {
    icon: Activity,
    title: 'Monitor AI Search Visibility',
    description: 'See how ChatGPT, Gemini, and Perplexity mention your brand.',
  },
  {
    icon: Lightbulb,
    title: 'Get Clear Optimization Actions',
    description: 'Receive specific recommendations to improve your AI visibility.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-violet-950/10" />
      
      <div className="container max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Get started in minutes, not days
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-violet-500/30 to-transparent" />
              )}
              
              <div className="text-center">
                {/* Step number */}
                <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-sm font-bold mb-4">
                  {index + 1}
                </div>
                
                {/* Icon */}
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 flex items-center justify-center mb-6">
                  <step.icon className="w-8 h-8 text-violet-400" />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
