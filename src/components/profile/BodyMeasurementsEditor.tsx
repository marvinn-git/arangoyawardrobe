import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Ruler, Save } from 'lucide-react';

interface BodyMeasurementsEditorProps {
  userId: string;
  initialMeasurements: {
    height_cm: number | null;
    weight_kg: number | null;
    chest_cm: number | null;
    waist_cm: number | null;
    hips_cm: number | null;
    shoulder_width_cm: number | null;
    inseam_cm: number | null;
  };
  onUpdate?: () => void;
}

export function BodyMeasurementsEditor({ 
  userId, 
  initialMeasurements,
  onUpdate 
}: BodyMeasurementsEditorProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [measurements, setMeasurements] = useState({
    height_cm: initialMeasurements.height_cm ?? '',
    weight_kg: initialMeasurements.weight_kg ?? '',
    chest_cm: initialMeasurements.chest_cm ?? '',
    waist_cm: initialMeasurements.waist_cm ?? '',
    hips_cm: initialMeasurements.hips_cm ?? '',
    shoulder_width_cm: initialMeasurements.shoulder_width_cm ?? '',
    inseam_cm: initialMeasurements.inseam_cm ?? '',
  });

  const handleChange = (field: string, value: string) => {
    setMeasurements(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: Record<string, number | null> = {};
      
      Object.entries(measurements).forEach(([key, value]) => {
        updateData[key] = value === '' ? null : Number(value);
      });

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Measurements updated",
        description: "Your body measurements have been saved.",
      });
      
      onUpdate?.();
    } catch (error) {
      console.error('Error saving measurements:', error);
      toast({
        title: "Error",
        description: "Failed to save measurements. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Ruler className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Body Measurements</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column - Illustration */}
        <div className="flex justify-center items-center p-4 bg-muted/30 rounded-lg">
          <svg
            viewBox="0 0 200 400"
            className="h-64 w-auto"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {/* Head */}
            <circle cx="100" cy="40" r="25" className="stroke-primary" />
            
            {/* Neck */}
            <line x1="100" y1="65" x2="100" y2="80" className="stroke-primary" />
            
            {/* Shoulders */}
            <line x1="50" y1="90" x2="150" y2="90" className="stroke-primary" />
            <line x1="100" y1="80" x2="100" y2="90" className="stroke-primary" />
            
            {/* Arms */}
            <line x1="50" y1="90" x2="30" y2="180" className="stroke-primary" />
            <line x1="150" y1="90" x2="170" y2="180" className="stroke-primary" />
            
            {/* Torso */}
            <path d="M 50 90 Q 45 130 55 170 L 70 250 L 130 250 L 145 170 Q 155 130 150 90" className="stroke-primary" />
            
            {/* Legs */}
            <line x1="70" y1="250" x2="60" y2="380" className="stroke-primary" />
            <line x1="130" y1="250" x2="140" y2="380" className="stroke-primary" />
            
            {/* Measurement lines */}
            {/* Shoulder width */}
            <line x1="50" y1="85" x2="150" y2="85" className="stroke-accent" strokeDasharray="4" />
            <text x="100" y="78" textAnchor="middle" className="fill-accent text-[10px]">Shoulders</text>
            
            {/* Chest */}
            <line x1="45" y1="120" x2="155" y2="120" className="stroke-accent" strokeDasharray="4" />
            <text x="165" y="123" className="fill-accent text-[10px]">Chest</text>
            
            {/* Waist */}
            <line x1="55" y1="170" x2="145" y2="170" className="stroke-accent" strokeDasharray="4" />
            <text x="160" y="173" className="fill-accent text-[10px]">Waist</text>
            
            {/* Hips */}
            <line x1="60" y1="220" x2="140" y2="220" className="stroke-accent" strokeDasharray="4" />
            <text x="155" y="223" className="fill-accent text-[10px]">Hips</text>
            
            {/* Inseam */}
            <line x1="100" y1="250" x2="100" y2="380" className="stroke-accent" strokeDasharray="4" />
            <text x="115" y="320" className="fill-accent text-[10px]">Inseam</text>
          </svg>
        </div>

        {/* Right column - Input fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                placeholder="175"
                value={measurements.height_cm}
                onChange={(e) => handleChange('height_cm', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                placeholder="70"
                value={measurements.weight_kg}
                onChange={(e) => handleChange('weight_kg', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chest">Chest (cm)</Label>
            <Input
              id="chest"
              type="number"
              placeholder="100"
              value={measurements.chest_cm}
              onChange={(e) => handleChange('chest_cm', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="waist">Waist (cm)</Label>
            <Input
              id="waist"
              type="number"
              placeholder="80"
              value={measurements.waist_cm}
              onChange={(e) => handleChange('waist_cm', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hips">Hips (cm)</Label>
            <Input
              id="hips"
              type="number"
              placeholder="95"
              value={measurements.hips_cm}
              onChange={(e) => handleChange('hips_cm', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shoulders">Shoulder Width (cm)</Label>
              <Input
                id="shoulders"
                type="number"
                placeholder="45"
                value={measurements.shoulder_width_cm}
                onChange={(e) => handleChange('shoulder_width_cm', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inseam">Inseam (cm)</Label>
              <Input
                id="inseam"
                type="number"
                placeholder="80"
                value={measurements.inseam_cm}
                onChange={(e) => handleChange('inseam_cm', e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="w-full mt-4"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Measurements'}
          </Button>
        </div>
      </div>
    </div>
  );
}
