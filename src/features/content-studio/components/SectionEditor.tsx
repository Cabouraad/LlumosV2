import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sparkles, ChevronDown, ChevronUp, Lightbulb, Loader2 } from 'lucide-react';
import type { SectionContent } from '../hooks/useContentEditor';
import { InlineAIMenu, type InlineAction } from './InlineAIMenu';
import { useInlineAI } from '../hooks/useInlineAI';

interface SectionEditorProps {
  section: SectionContent;
  sectionIndex: number;
  onContentChange: (content: string) => void;
  onChildContentChange?: (childIndex: number, content: string) => void;
  onAiAssist: () => Promise<string>;
  isAssisting: boolean;
  context?: string;
  toneGuidelines?: string[];
}

export function SectionEditor({
  section,
  sectionIndex,
  onContentChange,
  onChildContentChange,
  onAiAssist,
  isAssisting,
  context,
  toneGuidelines,
}: SectionEditorProps) {
  const [showSuggestions, setShowSuggestions] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectionInfo, setSelectionInfo] = useState<{
    start: number;
    end: number;
  } | null>(null);

  const { menuPosition, selectedText, handleTextSelection, performAction, closeMenu } = useInlineAI({
    context,
    toneGuidelines,
  });

  const handleAiAssist = async () => {
    try {
      const generated = await onAiAssist();
      onContentChange(section.content ? `${section.content}\n\n${generated}` : generated);
    } catch (error) {
      console.error('AI assist error:', error);
    }
  };

  const handleMouseUp = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      setSelectionInfo({ start, end });
      handleTextSelection();
    }
  }, [handleTextSelection]);

  const handleReplaceText = useCallback((newText: string) => {
    if (!selectionInfo) return;
    
    const before = section.content.slice(0, selectionInfo.start);
    const after = section.content.slice(selectionInfo.end);
    onContentChange(before + newText + after);
    setSelectionInfo(null);
  }, [section.content, selectionInfo, onContentChange]);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{section.heading}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAiAssist}
            disabled={isAssisting}
            className="gap-1.5"
          >
            {isAssisting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            )}
            AI Assist
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Suggestions */}
        <Collapsible open={showSuggestions} onOpenChange={setShowSuggestions}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-7 px-2">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs">Writing suggestions</span>
              {showSuggestions ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Include these points:</p>
              <div className="flex flex-wrap gap-1.5">
                {section.suggestions.map((suggestion, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs font-normal">
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Content Editor with inline AI */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={section.content}
            onChange={(e) => onContentChange(e.target.value)}
            onMouseUp={handleMouseUp}
            placeholder={`Write your content for "${section.heading}"... (Select text for AI editing options)`}
            className="min-h-[150px] resize-y"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Tip: Select text to rewrite, expand, or shorten with AI
          </p>
        </div>

        {/* Inline AI Menu */}
        {menuPosition && selectedText && (
          <InlineAIMenu
            selectedText={selectedText}
            position={menuPosition}
            onAction={performAction}
            onReplace={handleReplaceText}
            onClose={closeMenu}
          />
        )}

        {/* Child Sections */}
        {section.children && section.children.length > 0 && (
          <div className="space-y-4 pl-4 border-l-2 border-muted">
            {section.children.map((child, childIdx) => (
              <div key={childIdx} className="space-y-2">
                <h4 className="text-sm font-medium">{child.heading}</h4>
                <div className="p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                  <span className="font-medium">Suggestions: </span>
                  {child.suggestions.join(' • ')}
                </div>
                <Textarea
                  value={child.content}
                  onChange={(e) => onChildContentChange?.(childIdx, e.target.value)}
                  placeholder={`Write content for "${child.heading}"...`}
                  className="min-h-[100px] resize-y text-sm"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
