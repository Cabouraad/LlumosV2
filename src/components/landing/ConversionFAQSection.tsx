import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const conversionFAQs = [
  {
    question: "What is AI Search Optimization?",
    answer: "AI Search Optimization (also called GEO - Generative Engine Optimization) is the practice of optimizing your brand's content and online presence so that AI assistants like ChatGPT, Gemini, and Perplexity recommend you in their responses. Unlike traditional SEO which focuses on ranking in search results, AI SEO focuses on being mentioned and recommended in AI-generated answers."
  },
  {
    question: "How is this different from SEO tools?",
    answer: "Traditional SEO tools track your rankings in Google's search results. Llumos tracks something completely different: whether AI assistants mention and recommend your brand when users ask relevant questions. AI platforms like ChatGPT don't use the same ranking factors as Google — they draw from different sources and make different recommendations. You need visibility in both."
  },
  {
    question: "How fast do I see results?",
    answer: "You'll get your first AI visibility snapshot within 30 seconds of signing up. For ongoing tracking, you'll see data updates daily. In terms of improving your visibility, most brands see measurable improvements within 2-4 weeks of implementing our recommendations, as AI platforms regularly update their training data and response patterns."
  },
  {
    question: "Can agencies use this for clients?",
    answer: "Absolutely. Our Agency plan is designed specifically for agencies managing multiple client brands. You get separate dashboards for each client, white-label reporting capabilities, and the ability to track competitors across all accounts. Many agencies use Llumos to add AI visibility as a new service offering alongside their existing SEO services."
  }
];

export function ConversionFAQSection() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": conversionFAQs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>
      
      <section className="py-20 px-4 relative">
        <div className="container max-w-3xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Accordion type="single" collapsible className="w-full space-y-3">
              {conversionFAQs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`faq-${index}`}
                  className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-lg px-6 data-[state=open]:bg-violet-500/5 transition-colors"
                >
                  <AccordionTrigger className="text-left text-base md:text-lg font-medium hover:no-underline py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base pb-5 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>
    </>
  );
}
