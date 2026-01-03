import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, CreditCard, Zap, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export function FinalCTAV2() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="py-20 md:py-28 px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-background to-background" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
      
      <div className="container max-w-3xl mx-auto relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Get Your Free AI Visibility Report
          </h2>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground mb-8">
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Built for AI search
            </span>
            <span className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              No credit card
            </span>
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Instant preview
            </span>
          </div>

          <Button
            size="lg"
            onClick={scrollToTop}
            className="h-14 px-10 text-lg font-semibold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 group"
          >
            Get My Free AI Visibility Report
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
