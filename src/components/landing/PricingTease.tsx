import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const features = [
  'Daily AI visibility tracking',
  'Alerts when recommendations change',
  'Prompt-level optimization guidance',
  'Exportable reports',
];

export function PricingTease() {
  return (
    <section className="py-16 md:py-24 px-4 relative">
      <div className="container max-w-3xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 md:p-10 text-center"
        >
          <div className="inline-flex items-center gap-3 text-lg mb-6">
            <span className="font-medium">Free Report</span>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
            <span className="font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Paid Monitoring & Optimization
            </span>
          </div>

          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-8">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-2 text-muted-foreground">
                <Check className="w-4 h-4 text-success" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            size="lg"
            variant="outline"
            className="border-primary/50 hover:bg-primary/10 group"
            asChild
          >
            <Link to="/pricing">
              View plans
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
