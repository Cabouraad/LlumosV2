/**
 * Business Info Step - Step 1 of Local Authority Wizard
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Globe, Tags, X, Plus } from 'lucide-react';
import { LocalAuthorityFormData } from '@/hooks/useLocalAuthority';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface BusinessInfoStepProps {
  formData: LocalAuthorityFormData;
  onUpdate: (patch: Partial<LocalAuthorityFormData>) => void;
}

export function BusinessInfoStep({ formData, onUpdate }: BusinessInfoStepProps) {
  const [synonymInput, setSynonymInput] = useState('');

  const addSynonym = () => {
    const value = synonymInput.trim();
    if (value && !formData.brand_synonyms.includes(value)) {
      onUpdate({ brand_synonyms: [...formData.brand_synonyms, value] });
      setSynonymInput('');
    }
  };

  const removeSynonym = (synonym: string) => {
    onUpdate({ brand_synonyms: formData.brand_synonyms.filter(s => s !== synonym) });
  };

  const handleSynonymKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSynonym();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Business Information</h2>
        <p className="text-muted-foreground">
          Tell us about your business so we can track how AI recommends you.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="business_name" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Business Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="business_name"
            placeholder="e.g., Smith Plumbing & Heating"
            value={formData.business_name}
            onChange={(e) => onUpdate({ business_name: e.target.value })}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="domain" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Website Domain <span className="text-destructive">*</span>
          </Label>
          <Input
            id="domain"
            placeholder="e.g., smithplumbing.com"
            value={formData.domain}
            onChange={(e) => onUpdate({ domain: e.target.value })}
            className="h-12"
          />
          <p className="text-xs text-muted-foreground">
            Used to match brand mentions and citations
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Tags className="w-4 h-4" />
            Brand Synonyms <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add alternative business names"
              value={synonymInput}
              onChange={(e) => setSynonymInput(e.target.value)}
              onKeyDown={handleSynonymKeyDown}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="icon" onClick={addSynonym}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {formData.brand_synonyms.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.brand_synonyms.map((synonym) => (
                <Badge key={synonym} variant="secondary" className="gap-1 pr-1">
                  {synonym}
                  <button
                    type="button"
                    onClick={() => removeSynonym(synonym)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Include abbreviations, "DBA" names, or common misspellings
          </p>
        </div>
      </div>
    </div>
  );
}
