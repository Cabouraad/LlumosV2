import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Wand2, 
  Expand, 
  Minimize2, 
  RefreshCw, 
  Loader2,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type InlineAction = 'rewrite' | 'expand' | 'shorten' | 'improve' | 'simplify';

interface InlineAIMenuProps {
  selectedText: string;
  position: { x: number; y: number } | null;
  onAction: (action: InlineAction, text: string) => Promise<string>;
  onReplace: (newText: string) => void;
  onClose: () => void;
}

const ACTIONS: { id: InlineAction; label: string; icon: typeof Wand2; description: string }[] = [
  { id: 'rewrite', label: 'Rewrite', icon: RefreshCw, description: 'Rephrase differently' },
  { id: 'expand', label: 'Expand', icon: Expand, description: 'Add more detail' },
  { id: 'shorten', label: 'Shorten', icon: Minimize2, description: 'Make concise' },
  { id: 'improve', label: 'Improve', icon: Sparkles, description: 'Enhance quality' },
  { id: 'simplify', label: 'Simplify', icon: MessageSquare, description: 'Use simpler words' },
];

export function InlineAIMenu({
  selectedText,
  position,
  onAction,
  onReplace,
  onClose,
}: InlineAIMenuProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<InlineAction | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleAction = async (action: InlineAction) => {
    if (isLoading) return;
    
    setIsLoading(true);
    setActiveAction(action);
    setResult(null);

    try {
      const newText = await onAction(action, selectedText);
      setResult(newText);
    } catch (error) {
      console.error('Inline AI action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = () => {
    if (result) {
      onReplace(result);
      onClose();
    }
  };

  const handleReject = () => {
    setResult(null);
    setActiveAction(null);
  };

  if (!position) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-popover border rounded-lg shadow-lg p-1"
      style={{
        left: Math.min(position.x, window.innerWidth - 280),
        top: position.y + 10,
      }}
    >
      {result ? (
        <div className="p-3 max-w-xs space-y-3">
          <p className="text-xs text-muted-foreground font-medium">
            {ACTIONS.find(a => a.id === activeAction)?.label} result:
          </p>
          <p className="text-sm border-l-2 border-primary pl-3 py-1 bg-muted/50 rounded-r">
            {result.length > 200 ? `${result.slice(0, 200)}...` : result}
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAccept} className="flex-1 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={handleReject} className="flex-1">
              Try Again
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-0.5">
          {ACTIONS.map((action) => (
            <Button
              key={action.id}
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2.5 gap-1.5 text-xs",
                activeAction === action.id && "bg-muted"
              )}
              disabled={isLoading}
              onClick={() => handleAction(action.id)}
              title={action.description}
            >
              {isLoading && activeAction === action.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <action.icon className="h-3.5 w-3.5" />
              )}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
