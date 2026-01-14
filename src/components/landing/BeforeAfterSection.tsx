import { motion } from 'framer-motion';
import { Search, MousePointer, ExternalLink, Scale, MessageSquare, Sparkles, ThumbsUp, ShoppingCart } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function BeforeAfterSection() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-blue-950/10 to-background" />
      
      <div className="container max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
            The Shift
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            The Way People Search Has{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Changed
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            3.8 billion searches happen through AI every month. If you're not in their answers, you don't exist.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Before Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="relative p-8 bg-card/50 backdrop-blur-sm border-white/10 h-full">
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-zinc-500/20 text-zinc-400 text-xs font-medium">
                Before
              </div>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center">
                  <Search className="w-6 h-6 text-zinc-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-300">Google Search</h3>
                  <p className="text-sm text-muted-foreground">Traditional search journey</p>
                </div>
              </div>

              <div className="space-y-4">
                <Step 
                  icon={Search} 
                  text="Type keywords" 
                  description="best crm software 2024"
                  iconColor="text-zinc-400"
                />
                <Step 
                  icon={MousePointer} 
                  text="Click through 10 blue links" 
                  description="Visit multiple websites"
                  iconColor="text-zinc-400"
                />
                <Step 
                  icon={ExternalLink} 
                  text="Open many tabs" 
                  description="Compare features manually"
                  iconColor="text-zinc-400"
                />
                <Step 
                  icon={Scale} 
                  text="Compare yourself" 
                  description="Spend hours researching"
                  iconColor="text-zinc-400"
                />
              </div>
              
              <div className="mt-6 pt-6 border-t border-white/5">
                <p className="text-sm text-muted-foreground">
                  <span className="text-zinc-400 font-medium">Result:</span> Hours spent, decision fatigue, uncertain choice
                </p>
              </div>
            </Card>
          </motion.div>

          {/* After Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="relative p-8 bg-gradient-to-br from-violet-950/50 to-blue-950/50 backdrop-blur-sm border-violet-500/30 h-full shadow-lg shadow-violet-500/10">
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-violet-500/20 text-violet-400 text-xs font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Now
              </div>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">AI Assistants</h3>
                  <p className="text-sm text-muted-foreground">Modern search journey</p>
                </div>
              </div>

              <div className="space-y-4">
                <Step 
                  icon={MessageSquare} 
                  text="Ask natural question" 
                  description="What's the best CRM for my startup?"
                  iconColor="text-violet-400"
                  highlighted
                />
                <Step 
                  icon={Sparkles} 
                  text="Get instant recommendations" 
                  description="AI analyzes & ranks options"
                  iconColor="text-violet-400"
                  highlighted
                />
                <Step 
                  icon={ThumbsUp} 
                  text="Trust AI's top 3 picks" 
                  description="Pre-vetted, personalized"
                  iconColor="text-violet-400"
                  highlighted
                />
                <Step 
                  icon={ShoppingCart} 
                  text="Buy from AI's suggestion" 
                  description="Quick, confident decision"
                  iconColor="text-violet-400"
                  highlighted
                />
              </div>
              
              <div className="mt-6 pt-6 border-t border-violet-500/20">
                <p className="text-sm text-muted-foreground">
                  <span className="text-violet-400 font-medium">Result:</span> Minutes spent, high confidence, clear winner
                </p>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Bottom emphasis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-lg text-muted-foreground">
            <span className="text-foreground font-semibold">60%+ of search traffic</span> is shifting to AI.{' '}
            <span className="text-violet-400">Is your brand in the answer?</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function Step({ 
  icon: Icon, 
  text, 
  description, 
  iconColor,
  highlighted = false 
}: { 
  icon: React.ElementType; 
  text: string; 
  description: string;
  iconColor: string;
  highlighted?: boolean;
}) {
  return (
    <div className={`flex items-start gap-4 p-3 rounded-lg transition-colors ${highlighted ? 'bg-white/5' : ''}`}>
      <div className={`w-8 h-8 rounded-lg ${highlighted ? 'bg-violet-500/20' : 'bg-white/5'} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div>
        <p className="font-medium text-sm">{text}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
