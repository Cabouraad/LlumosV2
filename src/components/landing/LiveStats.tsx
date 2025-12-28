import { motion } from 'framer-motion';
import { Users, BarChart3, Zap } from 'lucide-react';

const stats = [
  { 
    icon: Users, 
    value: '2,847', 
    label: 'Brands Tracked', 
    suffix: '+',
    animationDelay: 0 
  },
  { 
    icon: BarChart3, 
    value: '1.2M', 
    label: 'AI Responses Analyzed', 
    suffix: '+',
    animationDelay: 0.1 
  },
  { 
    icon: Zap, 
    value: '47%', 
    label: 'Avg. Visibility Improvement', 
    suffix: '',
    animationDelay: 0.2 
  },
];

export function LiveStats() {
  return (
    <div className="flex flex-wrap justify-center gap-6 md:gap-10 py-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: stat.animationDelay + 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center">
            <stat.icon className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-xl md:text-2xl font-bold text-foreground">
              {stat.value}{stat.suffix}
            </p>
            <p className="text-xs text-muted-foreground">
              {stat.label}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
