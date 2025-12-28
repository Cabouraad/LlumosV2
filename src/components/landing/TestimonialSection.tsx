import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { Card } from '@/components/ui/card';

const testimonials = [
  {
    quote: "Llumos helped us increase our AI search mentions by 300% in just 60 days. Our sales team now gets warm leads who already know our key differentiators.",
    author: "Sarah Chen",
    role: "VP Marketing",
    company: "TechFlow",
    avatar: "SC",
    rating: 5,
  },
  {
    quote: "We discovered competitors were dominating AI responses in our category. Within 30 days using Llumos recommendations, we're now the top-mentioned brand.",
    author: "Mike Rodriguez", 
    role: "Growth Lead",
    company: "CloudVault",
    avatar: "MR",
    rating: 5,
  },
  {
    quote: "Finally, a tool that shows us what ChatGPT actually says about our brand. The competitive insights alone are worth 10x the price.",
    author: "Emily Watson",
    role: "Head of Digital",
    company: "FinServe Pro",
    avatar: "EW",
    rating: 5,
  },
];

const companyLogos = [
  { name: 'TechFlow', initial: 'T' },
  { name: 'CloudVault', initial: 'C' },
  { name: 'FinServe Pro', initial: 'F' },
  { name: 'DataSync', initial: 'D' },
  { name: 'MarketEdge', initial: 'M' },
];

export function TestimonialSection() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-violet-950/10 to-background" />
      
      <div className="container max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-4">
            Trusted by Marketing Teams
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            What Our Customers Say
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join hundreds of brands already optimizing their AI search visibility
          </p>
        </motion.div>

        {/* Company logos */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-8 mb-16"
        >
          {companyLogos.map((company, index) => (
            <div
              key={company.name}
              className="w-12 h-12 rounded-xl bg-card/50 border border-white/10 flex items-center justify-center text-muted-foreground font-bold hover:border-violet-500/30 hover:text-violet-400 transition-all"
            >
              {company.initial}
            </div>
          ))}
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-sm font-medium">
            +50
          </div>
        </motion.div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full p-6 bg-card/50 backdrop-blur-sm border-white/5 hover:border-violet-500/30 transition-all duration-300">
                {/* Quote icon */}
                <Quote className="w-8 h-8 text-violet-500/30 mb-4" />
                
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                {/* Quote */}
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                
                {/* Author */}
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.author}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
