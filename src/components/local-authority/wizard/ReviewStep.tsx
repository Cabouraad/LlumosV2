/**
 * Review Step - Step 4 of Local Authority Wizard
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, FolderOpen, Users, Pencil, Sparkles } from 'lucide-react';
import { LocalAuthorityFormData } from '@/hooks/useLocalAuthority';

interface ReviewStepProps {
  formData: LocalAuthorityFormData;
  onEdit: (step: 1 | 2 | 3 | 4) => void;
}

export function ReviewStep({ formData, onEdit }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Review & Start Scan</h2>
        <p className="text-muted-foreground">
          Review your settings before we start the Local AI Authority scan.
        </p>
      </div>

      <div className="grid gap-4">
        {/* Business Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Business Info
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onEdit(1)}>
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Name:</span>
              <span className="ml-2 font-medium">{formData.business_name}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Domain:</span>
              <span className="ml-2 font-medium">{formData.domain}</span>
            </div>
            {formData.brand_synonyms.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Synonyms:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {formData.brand_synonyms.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onEdit(2)}>
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Primary:</span>
              <span className="ml-2 font-medium">
                {formData.city}, {formData.state} {formData.zip}
              </span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Service Radius:</span>
              <span className="ml-2 font-medium">{formData.service_radius_miles} miles</span>
            </div>
            {formData.neighborhoods.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground">Neighborhoods:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {formData.neighborhoods.map((n) => (
                    <Badge key={n} variant="secondary" className="text-xs">
                      {n}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categories Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Categories
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onEdit(3)}>
                <Pencil className="w-3 h-3 mr-1" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {formData.categories.map((cat) => (
                <Badge key={cat}>{cat}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Competitors Card */}
        {formData.competitor_overrides.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Competitors
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onEdit(3)}>
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {formData.competitor_overrides.map((comp, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium">{comp.name}</span>
                    {comp.domain && (
                      <span className="text-muted-foreground ml-1">({comp.domain})</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* What happens next */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            What happens next?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• We'll generate 20-40 local prompts across 4 categories</li>
            <li>• Query ChatGPT, Gemini, and Perplexity with your local prompts</li>
            <li>• Extract brand mentions, recommendations, and competitor data</li>
            <li>• Calculate your Local AI Authority Score (0-100)</li>
            <li>• Generate actionable recommendations to improve your visibility</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
