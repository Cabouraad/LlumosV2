import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const aiBrands = [
  { name: 'ChatGPT', color: 'from-emerald-400 to-teal-400' },
  { name: 'Claude', color: 'from-orange-400 to-amber-400' },
  { name: 'Perplexity', color: 'from-blue-400 to-cyan-400' },
  { name: 'Gemini', color: 'from-violet-400 to-purple-400' },
];

export function RotatingAIBrands() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % aiBrands.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-block min-w-[180px] md:min-w-[220px]">
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={`bg-gradient-to-r ${aiBrands[currentIndex].color} bg-clip-text text-transparent`}
        >
          {aiBrands[currentIndex].name}
        </motion.span>
      </AnimatePresence>
      {/* Cursor effect */}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, repeatType: 'reverse' }}
        className="absolute -right-1 top-0 h-full w-[3px] bg-gradient-to-b from-violet-400 to-blue-400 rounded-full"
      />
    </span>
  );
}
