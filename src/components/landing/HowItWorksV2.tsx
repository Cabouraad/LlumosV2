import { motion } from 'framer-motion';

const steps = [
  {
    number: '1',
    title: 'Enter your website and competitors',
  },
  {
    number: '2',
    title: 'Llumos runs real AI queries daily',
  },
  {
    number: '3',
    title: 'Track visibility, fix gaps, and monitor improvements',
  },
];

export function HowItWorksV2() {
  return (
    <section className="py-16 md:py-24 px-4 relative">
      <div className="container max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How It Works
          </h2>
        </motion.div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="flex-1 relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-6 left-[60%] w-full h-px bg-gradient-to-r from-primary/30 to-transparent" />
              )}
              
              <div className="flex md:flex-col items-center md:text-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xl font-bold text-primary-foreground shrink-0">
                  {step.number}
                </div>
                <p className="text-lg font-medium">{step.title}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
