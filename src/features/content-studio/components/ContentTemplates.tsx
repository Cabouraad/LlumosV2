import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  ListOrdered,
  GitCompare,
  HelpCircle,
  BookOpen,
  Newspaper,
  Lightbulb,
  Target,
  Layout,
} from 'lucide-react';

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  icon: typeof FileText;
  category: 'article' | 'guide' | 'comparison' | 'reference';
  structure: {
    title: string;
    sections: {
      heading: string;
      suggestions: string[];
    }[];
    includeFaqs: boolean;
  };
}

const TEMPLATES: ContentTemplate[] = [
  {
    id: 'how-to-guide',
    name: 'How-To Guide',
    description: 'Step-by-step tutorial for achieving a specific goal',
    icon: BookOpen,
    category: 'guide',
    structure: {
      title: 'How to [Achieve Goal]',
      sections: [
        { heading: 'Introduction', suggestions: ['What this guide covers', 'Who this is for', 'What you\'ll learn'] },
        { heading: 'Prerequisites', suggestions: ['Required tools', 'Prior knowledge needed', 'Time estimate'] },
        { heading: 'Step 1: [First Step]', suggestions: ['Clear instructions', 'Expected outcome', 'Common mistakes'] },
        { heading: 'Step 2: [Second Step]', suggestions: ['Detailed walkthrough', 'Tips for success', 'Troubleshooting'] },
        { heading: 'Step 3: [Third Step]', suggestions: ['Final actions', 'Verification steps', 'Next steps'] },
        { heading: 'Conclusion', suggestions: ['Summary', 'Additional resources', 'Related guides'] },
      ],
      includeFaqs: true,
    },
  },
  {
    id: 'listicle',
    name: 'Listicle',
    description: 'Numbered list of items, tips, or recommendations',
    icon: ListOrdered,
    category: 'article',
    structure: {
      title: '[Number] Best [Topic] for [Year/Audience]',
      sections: [
        { heading: 'Introduction', suggestions: ['Why this list matters', 'How items were selected', 'What to expect'] },
        { heading: '1. [First Item]', suggestions: ['Key features', 'Pros and cons', 'Best for'] },
        { heading: '2. [Second Item]', suggestions: ['Unique benefits', 'Use cases', 'Pricing'] },
        { heading: '3. [Third Item]', suggestions: ['Standout qualities', 'Comparison to others', 'Recommendations'] },
        { heading: 'How to Choose', suggestions: ['Decision factors', 'Budget considerations', 'Use case matching'] },
      ],
      includeFaqs: true,
    },
  },
  {
    id: 'comparison',
    name: 'Comparison Article',
    description: 'Side-by-side comparison of products, services, or concepts',
    icon: GitCompare,
    category: 'comparison',
    structure: {
      title: '[Product A] vs [Product B]: [Year] Comparison',
      sections: [
        { heading: 'Overview', suggestions: ['Brief intro to both', 'Why compare these', 'Key differences'] },
        { heading: 'Features Comparison', suggestions: ['Feature-by-feature breakdown', 'Unique capabilities', 'Missing features'] },
        { heading: 'Pricing Comparison', suggestions: ['Pricing tiers', 'Value for money', 'Hidden costs'] },
        { heading: 'Pros and Cons', suggestions: ['Advantages of each', 'Limitations', 'Deal breakers'] },
        { heading: 'Which Should You Choose?', suggestions: ['Use case recommendations', 'Audience fit', 'Final verdict'] },
      ],
      includeFaqs: true,
    },
  },
  {
    id: 'ultimate-guide',
    name: 'Ultimate Guide',
    description: 'Comprehensive, authoritative resource on a topic',
    icon: Target,
    category: 'guide',
    structure: {
      title: 'The Ultimate Guide to [Topic]',
      sections: [
        { heading: 'What is [Topic]?', suggestions: ['Definition', 'History/Background', 'Why it matters'] },
        { heading: 'Key Concepts', suggestions: ['Core principles', 'Terminology', 'Frameworks'] },
        { heading: 'Getting Started', suggestions: ['First steps', 'Common approaches', 'Quick wins'] },
        { heading: 'Advanced Strategies', suggestions: ['Expert techniques', 'Optimization tips', 'Case studies'] },
        { heading: 'Common Mistakes to Avoid', suggestions: ['Pitfalls', 'Misconceptions', 'Warning signs'] },
        { heading: 'Tools and Resources', suggestions: ['Recommended tools', 'Further reading', 'Communities'] },
      ],
      includeFaqs: true,
    },
  },
  {
    id: 'faq-page',
    name: 'FAQ Page',
    description: 'Structured Q&A page optimized for featured snippets',
    icon: HelpCircle,
    category: 'reference',
    structure: {
      title: '[Topic] FAQ: Your Questions Answered',
      sections: [
        { heading: 'Overview', suggestions: ['What this page covers', 'Quick answers summary', 'Jump links'] },
        { heading: 'Getting Started Questions', suggestions: ['Beginner questions', 'Basic concepts', 'First steps'] },
        { heading: 'Technical Questions', suggestions: ['How-to questions', 'Troubleshooting', 'Advanced topics'] },
        { heading: 'Pricing & Plans', suggestions: ['Cost questions', 'Plan comparisons', 'Discounts'] },
      ],
      includeFaqs: true,
    },
  },
  {
    id: 'product-review',
    name: 'Product Review',
    description: 'In-depth review of a product or service',
    icon: Newspaper,
    category: 'article',
    structure: {
      title: '[Product] Review: [Key Verdict]',
      sections: [
        { heading: 'Quick Verdict', suggestions: ['TL;DR summary', 'Rating', 'Best for'] },
        { heading: 'What is [Product]?', suggestions: ['Product overview', 'Target audience', 'Key claims'] },
        { heading: 'Features & Capabilities', suggestions: ['Main features', 'Standout functionality', 'Integrations'] },
        { heading: 'User Experience', suggestions: ['Ease of use', 'Learning curve', 'Support quality'] },
        { heading: 'Pricing', suggestions: ['Plans breakdown', 'Value analysis', 'Alternatives at this price'] },
        { heading: 'Final Verdict', suggestions: ['Recommendation', 'Who should buy', 'Who should skip'] },
      ],
      includeFaqs: true,
    },
  },
  {
    id: 'pillar-page',
    name: 'Pillar Page',
    description: 'Central hub page linking to related content cluster',
    icon: Layout,
    category: 'guide',
    structure: {
      title: 'Complete Guide to [Topic]: Everything You Need to Know',
      sections: [
        { heading: 'Introduction to [Topic]', suggestions: ['What it is', 'Why it matters', 'Who this is for'] },
        { heading: 'Core Concepts', suggestions: ['Fundamental ideas', 'Key terminology', 'Basic framework'] },
        { heading: 'Key Areas', suggestions: ['Sub-topic overview', 'Related content links', 'Deep dive previews'] },
        { heading: 'Best Practices', suggestions: ['Industry standards', 'Expert tips', 'Common pitfalls'] },
        { heading: 'Getting Started', suggestions: ['Action steps', 'Resources needed', 'Timeline'] },
        { heading: 'Related Resources', suggestions: ['Internal links', 'Tools', 'Further reading'] },
      ],
      includeFaqs: true,
    },
  },
  {
    id: 'thought-leadership',
    name: 'Thought Leadership',
    description: 'Opinion piece establishing expertise and unique perspective',
    icon: Lightbulb,
    category: 'article',
    structure: {
      title: 'Why [Contrarian View] About [Topic]',
      sections: [
        { heading: 'The Problem', suggestions: ['Current state', 'Common misconceptions', 'Stakes involved'] },
        { heading: 'A New Perspective', suggestions: ['Your thesis', 'Supporting evidence', 'Why now'] },
        { heading: 'What This Means', suggestions: ['Implications', 'Industry impact', 'Future predictions'] },
        { heading: 'What To Do About It', suggestions: ['Action items', 'First steps', 'Resources'] },
        { heading: 'Conclusion', suggestions: ['Call to action', 'Open questions', 'Invitation to discuss'] },
      ],
      includeFaqs: false,
    },
  },
];

interface ContentTemplatesProps {
  onSelectTemplate: (template: ContentTemplate) => void;
}

export function ContentTemplates({ onSelectTemplate }: ContentTemplatesProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTemplates = selectedCategory
    ? TEMPLATES.filter((t) => t.category === selectedCategory)
    : TEMPLATES;

  const categories = [
    { id: 'article', label: 'Articles' },
    { id: 'guide', label: 'Guides' },
    { id: 'comparison', label: 'Comparisons' },
    { id: 'reference', label: 'Reference' },
  ];

  const handleSelect = (template: ContentTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Layout className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Content Templates</DialogTitle>
          <DialogDescription>
            Choose a template to structure your content. Each template is optimized for AI visibility.
          </DialogDescription>
        </DialogHeader>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleSelect(template)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <template.icon className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs">
                    {template.description}
                  </CardDescription>
                  <p className="text-xs text-muted-foreground mt-2">
                    {template.structure.sections.length} sections
                    {template.structure.includeFaqs && ' • Includes FAQs'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export { TEMPLATES };
