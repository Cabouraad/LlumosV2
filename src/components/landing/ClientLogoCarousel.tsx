import { motion } from 'framer-motion';

// Client logos - using company initials with styled backgrounds
const clients = [
  { name: 'Acme Corp', initial: 'A', color: 'from-blue-500 to-cyan-500' },
  { name: 'TechScale', initial: 'T', color: 'from-violet-500 to-purple-500' },
  { name: 'GrowthCo', initial: 'G', color: 'from-emerald-500 to-teal-500' },
  { name: 'Nexus AI', initial: 'N', color: 'from-orange-500 to-amber-500' },
  { name: 'Elevate', initial: 'E', color: 'from-pink-500 to-rose-500' },
  { name: 'Momentum', initial: 'M', color: 'from-indigo-500 to-blue-500' },
];

export function ClientLogoCarousel() {
  return (
    <section className="py-8 px-4 relative overflow-hidden border-t border-white/5">
      <div className="container max-w-6xl mx-auto">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-muted-foreground mb-6"
        >
          Trusted by <span className="text-foreground font-semibold">500+</span> marketing teams at innovative companies
        </motion.p>
        
        {/* Scrolling logo container */}
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
          
          {/* Infinite scroll animation */}
          <div className="flex overflow-hidden">
            <motion.div
              animate={{ x: ['0%', '-50%'] }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="flex gap-12 shrink-0"
            >
              {/* Double the logos for seamless loop */}
              {[...clients, ...clients].map((client, index) => (
                <div
                  key={`${client.name}-${index}`}
                  className="flex items-center gap-3 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${client.color} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                    {client.initial}
                  </div>
                  <span className="text-muted-foreground font-medium whitespace-nowrap">
                    {client.name}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
