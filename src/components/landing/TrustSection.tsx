import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Quote, Star } from 'lucide-react';

const testimonials = [
  {
    quote: "Llumos showed us exactly where we were invisible in AI search — and what to fix first.",
    author: "Sarah Chen",
    role: "VP of Marketing",
    company: "TechScale Inc.",
    avatar: "SC"
  },
  {
    quote: "We finally understand why competitors keep appearing in ChatGPT while we don't. Game-changer.",
    author: "Michael Rodriguez",
    role: "Head of Digital",
    company: "GrowthCo",
    avatar: "MR"
  },
  {
    quote: "The competitive insights alone are worth 10x the subscription cost.",
    author: "Emily Thompson",
    role: "CMO",
    company: "Elevate SaaS",
    avatar: "ET"
  }
];

const companyLogos = [
  { name: 'TechScale', initial: 'T' },
  { name: 'GrowthCo', initial: 'G' },
  { name: 'Elevate', initial: 'E' },
  { name: 'Nexus', initial: 'N' },
  { name: 'Momentum', initial: 'M' },
];

export function TrustSection() {
  return (
    <section className="py-20 px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent" />
      
      <div className="container max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for Modern SEO & Marketing Teams
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join hundreds of marketing teams tracking their AI visibility
          </p>
        </motion.div>

        {/* Company Logos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-8 mb-16"
        >
          {companyLogos.map((company, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg font-bold">
                {company.initial}
              </div>
              <span className="font-medium">{company.name}</span>
            </div>
          ))}
          <div className="text-muted-foreground/40 text-sm">+50 more</div>
        </motion.div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="relative group h-full bg-card/50 backdrop-blur-sm border-white/10 hover:border-violet-500/30 transition-all duration-300">
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-violet-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Quote className="w-5 h-5 text-violet-400" />
                </div>
                <CardContent className="pt-8 pb-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-base mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{testimonial.author}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      <p className="text-xs text-muted-foreground/70">{testimonial.company}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground/50 mt-8">
          * Testimonials shown are representative examples. Contact us for case studies.
        </p>
      </div>
    </section>
  );
}
