import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

export function LargeLogoSection() {
  return (
    <section className="pt-28 pb-4 px-4 relative">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[600px] h-[300px] bg-violet-500/20 rounded-full blur-[120px]" />
      </div>
      
      <motion.div 
        className="flex flex-col items-center justify-center relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Large Logo */}
        <motion.div
          className="flex items-center gap-4 mb-6"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-2xl shadow-violet-500/30">
            <Search className="w-10 h-10 md:w-12 md:h-12 text-white" />
          </div>
          <span className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-white to-white/70 bg-clip-text text-transparent">
            Llumos
          </span>
        </motion.div>
        
        {/* Tagline */}
        <motion.p 
          className="text-lg md:text-xl text-muted-foreground text-center max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          AI Search Visibility Platform
        </motion.p>
      </motion.div>
    </section>
  );
}
