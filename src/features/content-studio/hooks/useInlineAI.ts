import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InlineAction } from '../components/InlineAIMenu';

interface UseInlineAIOptions {
  context?: string;
  toneGuidelines?: string[];
}

export function useInlineAI(options: UseInlineAIOptions = {}) {
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');

  const inlineAction = useMutation({
    mutationFn: async ({ action, text }: { action: InlineAction; text: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('content-studio-assist', {
        body: {
          mode: 'inline',
          action,
          text,
          context: options.context || '',
          toneGuidelines: options.toneGuidelines || [],
        },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data.generatedContent as string;
    },
  });

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setMenuPosition(null);
      setSelectedText('');
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 10) {
      setMenuPosition(null);
      setSelectedText('');
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectedText(text);
    setMenuPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom,
    });
  }, []);

  const performAction = useCallback(
    async (action: InlineAction, text: string): Promise<string> => {
      const result = await inlineAction.mutateAsync({ action, text });
      return result;
    },
    [inlineAction]
  );

  const closeMenu = useCallback(() => {
    setMenuPosition(null);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  }, []);

  return {
    menuPosition,
    selectedText,
    isLoading: inlineAction.isPending,
    handleTextSelection,
    performAction,
    closeMenu,
  };
}
