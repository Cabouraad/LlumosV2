import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { User, Users, Building2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const planRecommendations = [
  {
    icon: User,
    audience: "Individuals & Small Teams",
    recommendation: "Start with Free or Starter",
    description: "For individuals and small teams learning how AI search impacts demand.",
    plans: ["Free", "Starter ($49/mo)"]
  },
  {
    icon: Users,
    audience: "Growth Teams & Agencies",
    recommendation: "Growth or Pro",
    description: "For growth teams and agencies tracking visibility across brands and competitors.",
    plans: ["Growth ($99/mo)", "Pro ($225/mo)"]
  },
  {
    icon: Building2,
    audience: "Enterprise & Multi-Brand",
    recommendation: "Agency Plan",
    description: "For organizations that need custom prompts, reporting, and scale.",
    plans: ["Agency ($399/mo)", "Custom Enterprise"]
  }
];

export function PlanChooserSection() {
  return (
    <section className="py-16 px-4">
      <div className="container max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Which plan should I choose?
          </h2>
          <p className="text-muted-foreground">
            Find the right fit for your team size and needs
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {planRecommendations.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{item.audience}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                  <div className="space-y-1">
                    {item.plans.map((plan, i) => (
                      <div key={i} className="text-sm text-primary/80">
                        → {plan}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-8"
        >
          <Link 
            to="/pricing" 
            className="inline-flex items-center text-primary hover:text-primary/80 transition-colors"
          >
            Compare all plans in detail
            <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
