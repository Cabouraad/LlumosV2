/**
 * Location Step - Step 2 of Local Authority Wizard
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { MapPin, Phone, Link2, Home, X, Plus } from 'lucide-react';
import { LocalAuthorityFormData } from '@/hooks/useLocalAuthority';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface LocationStepProps {
  formData: LocalAuthorityFormData;
  onUpdate: (patch: Partial<LocalAuthorityFormData>) => void;
}

export function LocationStep({ formData, onUpdate }: LocationStepProps) {
  const [neighborhoodInput, setNeighborhoodInput] = useState('');

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Service Location</h2>
        <p className="text-muted-foreground">
          Define your primary service area so we can test local AI queries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
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

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address" className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Street Address <span className="text-muted-foreground">(optional)</span>
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
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone <span className="text-muted-foreground">(optional)</span>
            </Label>
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

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Neighborhoods <span className="text-muted-foreground">(optional)</span>
          </Label>
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
            <div className="flex flex-wrap gap-2 mt-2">
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
      </div>
    </div>
  );
}
