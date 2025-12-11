import { motion } from 'framer-motion';

// OpenAI Logo SVG
const OpenAILogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
  </svg>
);

// Google Logo SVG
const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

// Anthropic Logo SVG
const AnthropicLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
    <path d="M13.827 3.52h3.603L24 20.48h-3.603l-6.57-16.96zm-7.258 0h3.767L16.906 20.48h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm2.327 10.088l-2.014-5.18-2.014 5.18h4.028z"/>
  </svg>
);

// Perplexity Logo SVG
const PerplexityLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
    <path d="M12 0L1.5 6v12L12 24l10.5-6V6L12 0zm0 2.25l8.25 4.714v9.072L12 20.75l-8.25-4.714V6.964L12 2.25zm0 3.375L6.375 9v6L12 18.375 17.625 15V9L12 5.625zm0 2.25L15.375 10.5v3L12 16.125 8.625 13.5v-3L12 7.875z"/>
  </svg>
);

const platforms = [
  { name: 'OpenAI', Logo: OpenAILogo, description: 'ChatGPT' },
  { name: 'Google', Logo: GoogleLogo, description: 'Gemini & AI Overviews' },
  { name: 'Perplexity', Logo: PerplexityLogo, description: 'AI Search' },
];

export function SocialProofSection() {
  return (
    <section className="py-20 px-4 relative overflow-hidden border-y border-white/5">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-violet-950/20 via-background to-blue-950/20" />
      
      <div className="container max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h3 className="text-xl text-muted-foreground mb-2">Optimize for:</h3>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          {platforms.map((platform, index) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-violet-500/30 transition-all duration-300 text-violet-400 group-hover:text-violet-300">
                <platform.Logo />
              </div>
              <h4 className="font-semibold mb-1 group-hover:text-violet-400 transition-colors">
                {platform.name}
              </h4>
              <p className="text-sm text-muted-foreground">
                {platform.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
