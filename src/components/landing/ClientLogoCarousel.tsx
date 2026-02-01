import { motion } from 'framer-motion';
import { useState } from 'react';

// Mid-market companies across diverse industries using Clearbit Logo API
const clients = [
  // Healthcare & Wellness
  { name: 'Hims & Hers', domain: 'forhims.com' },
  { name: 'Talkspace', domain: 'talkspace.com' },
  // E-commerce & Retail
  { name: 'Warby Parker', domain: 'warbyparker.com' },
  { name: 'Bombas', domain: 'bombas.com' },
  // Food & Beverage
  { name: 'Sweetgreen', domain: 'sweetgreen.com' },
  { name: 'Athletic Brewing', domain: 'athleticbrewing.com' },
  // Financial Services
  { name: 'Brex', domain: 'brex.com' },
  { name: 'Ramp', domain: 'ramp.com' },
  // Home & Lifestyle
  { name: 'Casper', domain: 'casper.com' },
  { name: 'Brooklinen', domain: 'brooklinen.com' },
  // Education & Learning
  { name: 'Duolingo', domain: 'duolingo.com' },
  { name: 'Coursera', domain: 'coursera.org' },
];

function ClientLogo({ name, domain }: { name: string; domain: string }) {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    return (
      <span className="text-muted-foreground font-semibold whitespace-nowrap text-lg">
        {name}
      </span>
    );
  }
  
  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={`${name} logo`}
      className="h-8 w-auto object-contain grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
      onError={() => setHasError(true)}
    />
  );
}

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
                duration: 25,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="flex gap-16 shrink-0 items-center"
            >
              {/* Double the logos for seamless loop */}
              {[...clients, ...clients].map((client, index) => (
                <div
                  key={`${client.name}-${index}`}
                  className="flex items-center shrink-0"
                >
                  <ClientLogo name={client.name} domain={client.domain} />
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
