import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Ruler, Camera, Upload, Sparkles } from 'lucide-react';

interface BodyMeasurementsStepProps {
  language: 'en' | 'es';
  chestCm: string;
  waistCm: string;
  hipsCm: string;
  shoulderWidthCm: string;
  inseamCm: string;
  onChestChange: (v: string) => void;
  onWaistChange: (v: string) => void;
  onHipsChange: (v: string) => void;
  onShoulderChange: (v: string) => void;
  onInseamChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function BodyMeasurementsStep({
  language,
  chestCm,
  waistCm,
  hipsCm,
  shoulderWidthCm,
  inseamCm,
  onChestChange,
  onWaistChange,
  onHipsChange,
  onShoulderChange,
  onInseamChange,
  onBack,
  onNext,
}: BodyMeasurementsStepProps) {
  const [showAiScan, setShowAiScan] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = () => {
    // Placeholder for AI body scanning feature
    setShowAiScan(true);
    setTimeout(() => setShowAiScan(false), 2000);
  };

  return (
    <Card className="w-full max-w-lg card-elevated animate-fade-in">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
            <Ruler className="h-5 w-5 text-accent" />
          </div>
          <div>
            <CardTitle className="font-display">
              {language === 'es' ? 'Medidas Corporales' : 'Body Measurements'}
            </CardTitle>
            <CardDescription>
              {language === 'es' 
                ? 'Opcional - ayuda a la IA a sugerir mejores outfits' 
                : 'Optional - helps AI suggest better outfits'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Body Illustration */}
        <div className="relative bg-secondary/30 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 200 300" className="w-32 h-48 text-muted-foreground">
              {/* Simple body silhouette */}
              <ellipse cx="100" cy="30" rx="25" ry="28" fill="currentColor" opacity="0.3" />
              {/* Shoulders */}
              <path d="M50 70 Q100 60 150 70 L145 90 Q100 85 55 90 Z" fill="currentColor" opacity="0.3" />
              {/* Torso */}
              <path d="M55 90 Q50 130 60 180 L140 180 Q150 130 145 90 Q100 85 55 90 Z" fill="currentColor" opacity="0.3" />
              {/* Legs */}
              <path d="M60 180 L55 280 L75 280 L90 200 L100 200 L110 200 L125 280 L145 280 L140 180 Z" fill="currentColor" opacity="0.3" />
              
              {/* Measurement lines */}
              {/* Shoulders */}
              <line x1="45" y1="75" x2="155" y2="75" stroke="hsl(var(--accent))" strokeWidth="2" strokeDasharray="4" />
              <circle cx="45" cy="75" r="4" fill="hsl(var(--accent))" />
              <circle cx="155" cy="75" r="4" fill="hsl(var(--accent))" />
              <text x="160" y="78" fontSize="10" fill="hsl(var(--accent))" fontWeight="bold">1</text>
              
              {/* Chest */}
              <line x1="50" y1="100" x2="150" y2="100" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4" />
              <circle cx="50" cy="100" r="4" fill="hsl(var(--primary))" />
              <circle cx="150" cy="100" r="4" fill="hsl(var(--primary))" />
              <text x="155" y="103" fontSize="10" fill="hsl(var(--primary))" fontWeight="bold">2</text>
              
              {/* Waist */}
              <line x1="55" y1="140" x2="145" y2="140" stroke="hsl(var(--destructive))" strokeWidth="2" strokeDasharray="4" />
              <circle cx="55" cy="140" r="4" fill="hsl(var(--destructive))" />
              <circle cx="145" cy="140" r="4" fill="hsl(var(--destructive))" />
              <text x="150" y="143" fontSize="10" fill="hsl(var(--destructive))" fontWeight="bold">3</text>
              
              {/* Hips */}
              <line x1="58" y1="175" x2="142" y2="175" stroke="hsl(var(--accent))" strokeWidth="2" strokeDasharray="4" />
              <circle cx="58" cy="175" r="4" fill="hsl(var(--accent))" />
              <circle cx="142" cy="175" r="4" fill="hsl(var(--accent))" />
              <text x="147" y="178" fontSize="10" fill="hsl(var(--accent))" fontWeight="bold">4</text>
              
              {/* Inseam */}
              <line x1="100" y1="185" x2="100" y2="275" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4" />
              <circle cx="100" cy="185" r="4" fill="hsl(var(--primary))" />
              <circle cx="100" cy="275" r="4" fill="hsl(var(--primary))" />
              <text x="105" y="230" fontSize="10" fill="hsl(var(--primary))" fontWeight="bold">5</text>
            </svg>
          </div>
          <div className="absolute right-3 top-3">
            <div className="text-xs space-y-1 bg-background/80 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-accent text-[10px] flex items-center justify-center text-accent-foreground font-bold">1</span>
                <span>{language === 'es' ? 'Hombros' : 'Shoulders'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-primary text-[10px] flex items-center justify-center text-primary-foreground font-bold">2</span>
                <span>{language === 'es' ? 'Pecho' : 'Chest'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-destructive text-[10px] flex items-center justify-center text-destructive-foreground font-bold">3</span>
                <span>{language === 'es' ? 'Cintura' : 'Waist'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-accent text-[10px] flex items-center justify-center text-accent-foreground font-bold">4</span>
                <span>{language === 'es' ? 'Cadera' : 'Hips'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-primary text-[10px] flex items-center justify-center text-primary-foreground font-bold">5</span>
                <span>{language === 'es' ? 'Entrepierna' : 'Inseam'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Scan Option */}
        <div className="bg-accent/10 rounded-lg p-3 border border-accent/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {language === 'es' ? 'Escaneo con IA' : 'AI Body Scan'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'es' 
                  ? 'Sube una foto y la IA estimará tus medidas' 
                  : 'Upload a photo and AI will estimate your measurements'}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={showAiScan}
            >
              {showAiScan ? (
                <span className="animate-pulse">{language === 'es' ? 'Analizando...' : 'Analyzing...'}</span>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-1" />
                  {language === 'es' ? 'Subir' : 'Upload'}
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="sr-only"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {language === 'es' 
              ? '🔒 Tu foto no se guarda y solo se usa para estimar medidas' 
              : '🔒 Your photo is not saved and only used to estimate measurements'}
          </p>
        </div>

        {/* Manual Input Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="shoulder" className="text-xs flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-accent text-[10px] flex items-center justify-center text-accent-foreground font-bold">1</span>
              {language === 'es' ? 'Hombros (cm)' : 'Shoulders (cm)'}
            </Label>
            <Input
              id="shoulder"
              type="number"
              value={shoulderWidthCm}
              onChange={(e) => onShoulderChange(e.target.value)}
              placeholder="45"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="chest" className="text-xs flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-primary text-[10px] flex items-center justify-center text-primary-foreground font-bold">2</span>
              {language === 'es' ? 'Pecho (cm)' : 'Chest (cm)'}
            </Label>
            <Input
              id="chest"
              type="number"
              value={chestCm}
              onChange={(e) => onChestChange(e.target.value)}
              placeholder="95"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="waist" className="text-xs flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-destructive text-[10px] flex items-center justify-center text-destructive-foreground font-bold">3</span>
              {language === 'es' ? 'Cintura (cm)' : 'Waist (cm)'}
            </Label>
            <Input
              id="waist"
              type="number"
              value={waistCm}
              onChange={(e) => onWaistChange(e.target.value)}
              placeholder="80"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hips" className="text-xs flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-accent text-[10px] flex items-center justify-center text-accent-foreground font-bold">4</span>
              {language === 'es' ? 'Cadera (cm)' : 'Hips (cm)'}
            </Label>
            <Input
              id="hips"
              type="number"
              value={hipsCm}
              onChange={(e) => onHipsChange(e.target.value)}
              placeholder="100"
              className="h-9"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label htmlFor="inseam" className="text-xs flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-primary text-[10px] flex items-center justify-center text-primary-foreground font-bold">5</span>
              {language === 'es' ? 'Entrepierna (cm)' : 'Inseam (cm)'}
            </Label>
            <Input
              id="inseam"
              type="number"
              value={inseamCm}
              onChange={(e) => onInseamChange(e.target.value)}
              placeholder="78"
              className="h-9"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {language === 'es' 
            ? 'Puedes omitir esta sección y añadir las medidas más tarde' 
            : 'You can skip this section and add measurements later'}
        </p>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button onClick={onNext} className="flex-1 gap-2">
            {language === 'es' ? 'Continuar' : 'Continue'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
