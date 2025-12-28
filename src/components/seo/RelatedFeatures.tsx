import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BarChart3, Target, FileText, Lightbulb, PenTool, FileCode } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface Feature {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const ALL_FEATURES: Feature[] = [
  {
    title: 'Brand Visibility',
    description: 'Monitor your brand presence across AI search platforms in real-time',
    href: '/features/brand-visibility',
    icon: Target,
  },
  {
    title: 'Competitive Analysis',
    description: 'Track competitors and benchmark your AI visibility against industry leaders',
    href: '/features/competitive-analysis',
    icon: BarChart3,
  },
  {
    title: 'Citation Analysis',
    description: 'Discover which sources AI platforms cite when mentioning your brand',
    href: '/features/citation-analysis',
    icon: FileText,
  },
  {
    title: 'Actionable Recommendations',
    description: 'Get AI-powered suggestions to improve your visibility scores',
    href: '/features/actionable-recommendations',
    icon: Lightbulb,
  },
  {
    title: 'Content Studio',
    description: 'Create AI-optimized content that gets cited by language models',
    href: '/features/content-studio',
    icon: PenTool,
  },
  {
    title: 'LLMs.txt Generator',
    description: 'Generate structured data files to help AI understand your site',
    href: '/features/llms-txt',
    icon: FileCode,
  },
];

interface RelatedFeaturesProps {
  currentFeature: string;
  title?: string;
  maxFeatures?: number;
  className?: string;
}

/**
 * RelatedFeatures Component
 * 
 * Displays related feature cards for internal linking between feature pages.
 * Automatically excludes the current feature from the list.
 * 
 * @param currentFeature - The href of the current feature page to exclude
 * @param title - Optional custom title for the section
 * @param maxFeatures - Maximum number of features to display (default: 3)
 */
export const RelatedFeatures = ({ 
  currentFeature, 
  title = 'Explore More Features',
  maxFeatures = 3,
  className = ''
}: RelatedFeaturesProps) => {
  // Filter out the current feature and limit results
  const relatedFeatures = ALL_FEATURES
    .filter(feature => feature.href !== currentFeature)
    .slice(0, maxFeatures);

  return (
    <section className={`py-16 px-4 bg-muted/30 ${className}`}>
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover how Llumos helps you dominate AI search visibility with our complete suite of tools.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {relatedFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.href} to={feature.href} className="group">
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary/50">
                  <CardHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="flex items-center gap-2">
                      {feature.title}
                      <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link 
            to="/features" 
            className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors"
          >
            View all features
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default RelatedFeatures;
