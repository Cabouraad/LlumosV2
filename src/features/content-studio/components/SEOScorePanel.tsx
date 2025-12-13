import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Type,
  FileText,
  Link2,
  Hash,
  Target,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EditorState } from '../hooks/useContentEditor';
import type { ContentStudioItem } from '../types';

interface SEOScorePanelProps {
  editorState: EditorState;
  item: ContentStudioItem;
}

interface SEOCheck {
  id: string;
  label: string;
  icon: typeof Type;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  weight: number;
}

export function SEOScorePanel({ editorState, item }: SEOScorePanelProps) {
  const checks = useMemo<SEOCheck[]>(() => {
    const title = editorState.title || '';
    const allContent = [
      ...editorState.sections.map(s => s.content),
      ...editorState.sections.flatMap(s => s.children?.map(c => c.content) || []),
      ...editorState.faqs.map(f => f.answer),
    ].filter(Boolean).join(' ');
    
    const wordCount = allContent.split(/\s+/).filter(Boolean).length;
    const headingCount = editorState.sections.length;
    const filledSections = editorState.sections.filter(s => s.content.trim().length > 50).length;
    const answeredFaqs = editorState.faqs.filter(f => f.answer.trim().length > 20).length;
    
    // Check for key entities in content
    const entityMentions = item.key_entities.filter(entity => 
      allContent.toLowerCase().includes(entity.toLowerCase())
    ).length;

    const results: SEOCheck[] = [];

    // Title length check (50-60 chars optimal)
    const titleLength = title.length;
    results.push({
      id: 'title-length',
      label: 'Title Length',
      icon: Type,
      status: titleLength >= 50 && titleLength <= 60 ? 'pass' : 
              titleLength >= 40 && titleLength <= 70 ? 'warning' : 'fail',
      message: titleLength === 0 ? 'Add a title' :
               titleLength < 40 ? `Too short (${titleLength}/50-60 chars)` :
               titleLength > 70 ? `Too long (${titleLength}/50-60 chars)` :
               `Good length (${titleLength} chars)`,
      weight: 15,
    });

    // Word count check (aim for 1500+ for comprehensive content)
    results.push({
      id: 'word-count',
      label: 'Content Length',
      icon: FileText,
      status: wordCount >= 1500 ? 'pass' : wordCount >= 800 ? 'warning' : 'fail',
      message: wordCount < 300 ? `Very short (${wordCount} words)` :
               wordCount < 800 ? `Add more content (${wordCount}/1500+ words)` :
               wordCount < 1500 ? `Good, aim for more (${wordCount}/1500+ words)` :
               `Excellent (${wordCount} words)`,
      weight: 20,
    });

    // Section completion
    results.push({
      id: 'sections',
      label: 'Section Completion',
      icon: Hash,
      status: filledSections === headingCount ? 'pass' : 
              filledSections >= headingCount * 0.5 ? 'warning' : 'fail',
      message: `${filledSections}/${headingCount} sections complete`,
      weight: 15,
    });

    // FAQ completion
    if (editorState.faqs.length > 0) {
      results.push({
        id: 'faqs',
        label: 'FAQ Answers',
        icon: Target,
        status: answeredFaqs === editorState.faqs.length ? 'pass' :
                answeredFaqs >= editorState.faqs.length * 0.5 ? 'warning' : 'fail',
        message: `${answeredFaqs}/${editorState.faqs.length} FAQs answered`,
        weight: 15,
      });
    }

    // Key entity coverage
    results.push({
      id: 'entities',
      label: 'Key Entity Coverage',
      icon: Link2,
      status: entityMentions >= item.key_entities.length * 0.8 ? 'pass' :
              entityMentions >= item.key_entities.length * 0.5 ? 'warning' : 'fail',
      message: `${entityMentions}/${item.key_entities.length} entities mentioned`,
      weight: 20,
    });

    // Content structure (subheadings, paragraphs)
    const avgSectionLength = filledSections > 0 
      ? editorState.sections.filter(s => s.content).reduce((acc, s) => acc + s.content.length, 0) / filledSections
      : 0;
    results.push({
      id: 'structure',
      label: 'Content Structure',
      icon: Sparkles,
      status: avgSectionLength >= 200 && avgSectionLength <= 500 ? 'pass' :
              avgSectionLength >= 100 ? 'warning' : 'fail',
      message: avgSectionLength < 100 ? 'Sections too short' :
               avgSectionLength > 600 ? 'Consider breaking into subsections' :
               'Well-structured sections',
      weight: 15,
    });

    return results;
  }, [editorState, item]);

  const totalScore = useMemo(() => {
    const totalWeight = checks.reduce((acc, c) => acc + c.weight, 0);
    const earned = checks.reduce((acc, c) => {
      if (c.status === 'pass') return acc + c.weight;
      if (c.status === 'warning') return acc + c.weight * 0.5;
      return acc;
    }, 0);
    return Math.round((earned / totalWeight) * 100);
  }, [checks]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getStatusIcon = (status: SEOCheck['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case 'warning': return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
      case 'fail': return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">SEO Score</CardTitle>
          <span className={cn("text-2xl font-bold", getScoreColor(totalScore))}>
            {totalScore}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress 
          value={totalScore} 
          className="h-2"
        />
        
        <div className="space-y-2">
          {checks.map((check) => (
            <div 
              key={check.id}
              className="flex items-center gap-2 text-xs"
            >
              {getStatusIcon(check.status)}
              <div className="flex-1">
                <span className="font-medium">{check.label}</span>
                <span className="text-muted-foreground ml-1.5">
                  {check.message}
                </span>
              </div>
            </div>
          ))}
        </div>

        {totalScore < 80 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {totalScore < 50 
                ? "Focus on adding more content and completing sections."
                : "Almost there! Address the warnings above to improve your score."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
