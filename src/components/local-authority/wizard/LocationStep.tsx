/**
 * Location Step - Step 2 of Local Authority Wizard
 * Enhanced with multi-service-area support and location priority
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Phone, Link2, Home, X, Plus, Building2, Layers } from 'lucide-react';
import { LocalAuthorityFormData, ServiceArea } from '@/hooks/useLocalAuthority';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface LocationStepProps {
  formData: LocalAuthorityFormData;
  onUpdate: (patch: Partial<LocalAuthorityFormData>) => void;
  autoNeighborhoods?: string[];
  hasLocationIntelligence?: boolean;
}

export function LocationStep({ formData, onUpdate, autoNeighborhoods = [], hasLocationIntelligence = false }: LocationStepProps) {
  const [neighborhoodInput, setNeighborhoodInput] = useState('');
  const [newServiceArea, setNewServiceArea] = useState<Partial<ServiceArea>>({
    city: '',
    state: '',
    priority: 'secondary',
  });

  const addNeighborhood = () => {
    const value = neighborhoodInput.trim();
    if (value && !formData.neighborhoods.includes(value)) {
      onUpdate({ neighborhoods: [...formData.neighborhoods, value] });
      setNeighborhoodInput('');
    }
  };

  const removeNeighborhood = (neighborhood: string) => {
    onUpdate({ neighborhoods: formData.neighborhoods.filter(n => n !== neighborhood) });
  };

  const handleNeighborhoodKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNeighborhood();
    }
  };

  const addSuggestedNeighborhood = (neighborhood: string) => {
    if (!formData.neighborhoods.includes(neighborhood)) {
      onUpdate({ neighborhoods: [...formData.neighborhoods, neighborhood] });
    }
  };

  const addServiceArea = () => {
    if (newServiceArea.city?.trim() && newServiceArea.state?.trim()) {
      const area: ServiceArea = {
        city: newServiceArea.city.trim(),
        state: newServiceArea.state.trim(),
        priority: newServiceArea.priority || 'secondary',
      };
      onUpdate({ service_areas: [...formData.service_areas, area] });
      setNewServiceArea({ city: '', state: '', priority: 'secondary' });
    }
  };

  const removeServiceArea = (index: number) => {
    const updated = formData.service_areas.filter((_, i) => i !== index);
    onUpdate({ service_areas: updated });
  };

  // Filter out neighborhoods already added
  const availableSuggestions = autoNeighborhoods.filter(n => !formData.neighborhoods.includes(n));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Service Location</h2>
        <p className="text-muted-foreground">
          Define your primary service area so we can test local AI queries.
        </p>
      </div>

      {/* Primary Location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Primary Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                placeholder="e.g., Austin"
                value={formData.city}
                onChange={(e) => onUpdate({ city: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">
                State <span className="text-destructive">*</span>
              </Label>
              <Input
                id="state"
                placeholder="e.g., TX"
                value={formData.state}
                onChange={(e) => onUpdate({ state: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                placeholder="e.g., 78701"
                value={formData.zip}
                onChange={(e) => onUpdate({ zip: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => onUpdate({ country: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Service Radius</Label>
              <span className="text-sm font-medium">{formData.service_radius_miles} miles</span>
            </div>
            <Slider
              value={[formData.service_radius_miles]}
              onValueChange={([value]) => onUpdate({ service_radius_miles: value })}
              min={5}
              max={100}
              step={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Neighborhoods Section */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Neighborhoods
          <span className="text-muted-foreground text-sm">(improves local prompt accuracy)</span>
        </Label>
        
        {/* Auto-suggested neighborhoods */}
        {availableSuggestions.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              ✨ Suggested neighborhoods for {formData.city}:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availableSuggestions.slice(0, 8).map((neighborhood) => (
                <Badge 
                  key={neighborhood} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => addSuggestedNeighborhood(neighborhood)}
                >
                  + {neighborhood}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Add neighborhoods you serve"
            value={neighborhoodInput}
            onChange={(e) => setNeighborhoodInput(e.target.value)}
            onKeyDown={handleNeighborhoodKeyDown}
            className="flex-1"
          />
          <Button type="button" variant="outline" size="icon" onClick={addNeighborhood}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {formData.neighborhoods.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.neighborhoods.map((neighborhood) => (
              <Badge key={neighborhood} variant="secondary" className="gap-1 pr-1">
                {neighborhood}
                <button
                  type="button"
                  onClick={() => removeNeighborhood(neighborhood)}
                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Additional Service Areas */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="service-areas" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>Additional Service Areas</span>
              {formData.service_areas.length > 0 && (
                <Badge variant="secondary" className="ml-2">{formData.service_areas.length}</Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add cities where you also provide services. We'll generate localized prompts for these areas too.
              </p>

              {/* Existing service areas */}
              {formData.service_areas.length > 0 && (
                <div className="space-y-2">
                  {formData.service_areas.map((area, index) => (
                    <div key={index} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                      <span className="flex-1">{area.city}, {area.state}</span>
                      <Badge variant={area.priority === 'secondary' ? 'secondary' : 'outline'}>
                        {area.priority}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeServiceArea(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new service area */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <Input
                  placeholder="City"
                  value={newServiceArea.city}
                  onChange={(e) => setNewServiceArea({ ...newServiceArea, city: e.target.value })}
                />
                <Input
                  placeholder="State"
                  value={newServiceArea.state}
                  onChange={(e) => setNewServiceArea({ ...newServiceArea, state: e.target.value })}
                />
                <Select
                  value={newServiceArea.priority}
                  onValueChange={(value: 'secondary' | 'expansion') => 
                    setNewServiceArea({ ...newServiceArea, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="expansion">Expansion</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addServiceArea}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Business Contact Info */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="contact" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>Business Contact Details</span>
              <span className="text-muted-foreground text-sm">(optional)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Street Address
                </Label>
                <Input
                  id="address"
                  placeholder="e.g., 123 Main St"
                  value={formData.address}
                  onChange={(e) => onUpdate({ address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => onUpdate({ phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gbp_url" className="flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Google Business Profile URL
                  </Label>
                  <Input
                    id="gbp_url"
                    placeholder="https://g.page/..."
                    value={formData.gbp_url}
                    onChange={(e) => onUpdate({ gbp_url: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Location Intelligence indicator */}
      {hasLocationIntelligence && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
          <span className="text-lg">🗺️</span>
          <span>
            We found local intelligence data for {formData.city}. Your prompts will include semantic location variants and landmarks.
          </span>
        </div>
      )}
    </div>
  );
}
