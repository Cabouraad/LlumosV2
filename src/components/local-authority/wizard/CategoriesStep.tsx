/**
 * Categories & Competitors Step - Step 3 of Local Authority Wizard
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FolderOpen, Users, X, Plus, Trash2 } from 'lucide-react';
import { LocalAuthorityFormData } from '@/hooks/useLocalAuthority';
import { useState } from 'react';
import { CompetitorOverride } from '@/types/local-authority';

interface CategoriesStepProps {
  formData: LocalAuthorityFormData;
  onUpdate: (patch: Partial<LocalAuthorityFormData>) => void;
}

// Common business categories
const suggestedCategories = [
  'Plumber', 'HVAC', 'Electrician', 'Landscaper', 'Roofer',
  'Dentist', 'Doctor', 'Therapist', 'Chiropractor',
  'Lawyer', 'Accountant', 'Real Estate Agent',
  'Restaurant', 'Cafe', 'Salon', 'Spa', 'Gym',
  'Auto Repair', 'Cleaning Service', 'Pest Control',
];

export function CategoriesStep({ formData, onUpdate }: CategoriesStepProps) {
  const [categoryInput, setCategoryInput] = useState('');
  const [competitorName, setCompetitorName] = useState('');
  const [competitorDomain, setCompetitorDomain] = useState('');

  const addCategory = (category?: string) => {
    const value = (category || categoryInput).trim();
    if (value && !formData.categories.includes(value)) {
      onUpdate({ categories: [...formData.categories, value] });
      setCategoryInput('');
    }
  };

  const removeCategory = (category: string) => {
    onUpdate({ categories: formData.categories.filter(c => c !== category) });
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCategory();
    }
  };

  const addCompetitor = () => {
    const name = competitorName.trim();
    if (name) {
      const newCompetitor: CompetitorOverride = {
        name,
        domain: competitorDomain.trim() || undefined,
      };
      onUpdate({ competitor_overrides: [...formData.competitor_overrides, newCompetitor] });
      setCompetitorName('');
      setCompetitorDomain('');
    }
  };

  const removeCompetitor = (index: number) => {
    onUpdate({
      competitor_overrides: formData.competitor_overrides.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Categories & Competitors</h2>
        <p className="text-muted-foreground">
          Define your business categories and optionally add known competitors to track.
        </p>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Business Categories <span className="text-destructive">*</span>
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a category (e.g., Plumber)"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyDown={handleCategoryKeyDown}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="icon" onClick={() => addCategory()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Selected Categories */}
        {formData.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.categories.map((category) => (
              <Badge key={category} className="gap-1 pr-1">
                {category}
                <button
                  type="button"
                  onClick={() => removeCategory(category)}
                  className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Suggested Categories */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Quick add:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedCategories
              .filter(cat => !formData.categories.includes(cat))
              .slice(0, 12)
              .map((category) => (
                <Badge
                  key={category}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => addCategory(category)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {category}
                </Badge>
              ))}
          </div>
        </div>
      </div>

      {/* Competitors */}
      <div className="space-y-4 pt-4 border-t">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Competitor Overrides <span className="text-muted-foreground">(optional)</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Add specific competitors you want to track. We'll also auto-detect competitors from AI responses.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Competitor name"
            value={competitorName}
            onChange={(e) => setCompetitorName(e.target.value)}
            className="flex-1 min-w-[150px]"
          />
          <Input
            placeholder="Domain (optional)"
            value={competitorDomain}
            onChange={(e) => setCompetitorDomain(e.target.value)}
            className="flex-1 min-w-[150px]"
          />
          <Button type="button" variant="outline" onClick={addCompetitor} disabled={!competitorName.trim()}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {formData.competitor_overrides.length > 0 && (
          <div className="space-y-2">
            {formData.competitor_overrides.map((competitor, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
              >
                <div>
                  <span className="font-medium">{competitor.name}</span>
                  {competitor.domain && (
                    <span className="text-muted-foreground text-sm ml-2">
                      ({competitor.domain})
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCompetitor(index)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
