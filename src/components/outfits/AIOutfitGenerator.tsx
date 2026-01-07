import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Wand2, Loader2, Check, Sparkles } from 'lucide-react';

interface AISuggestion {
  outfit_name: string;
  top_id: string;
  bottom_id: string;
  accessory_ids?: string[];
  styling_tips: string;
  explanation: string;
  items: Array<{
    id: string;
    name: string;
    image_url: string;
  }>;
}

interface AIOutfitGeneratorProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AIOutfitGenerator({ onSuccess, onCancel }: AIOutfitGeneratorProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  
  // Optional inputs
  const [occasion, setOccasion] = useState('');
  const [weather, setWeather] = useState('');
  const [mood, setMood] = useState('');
  const [extraDetails, setExtraDetails] = useState('');

  const handleGenerate = async () => {
    if (!user) return;

    setGenerating(true);
    setSuggestion(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-outfit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ occasion, weather, mood, extraDetails }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate outfit');
      }

      setSuggestion(data.suggestion);
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast({
        title: t('aiError'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveOutfit = async () => {
    if (!user || !suggestion) return;

    setSaving(true);

    try {
      // Create the outfit
      const { data: outfit, error: outfitError } = await supabase
        .from('outfits')
        .insert({
          user_id: user.id,
          name: suggestion.outfit_name,
          notes: `${suggestion.explanation}\n\nStyling tips: ${suggestion.styling_tips}`,
          tags: ['AI Generated'],
        })
        .select()
        .single();

      if (outfitError) throw outfitError;

      // Add outfit items
      const itemIds = [
        suggestion.top_id,
        suggestion.bottom_id,
        ...(suggestion.accessory_ids || []),
      ];

      const outfitItems = itemIds.map((clothingItemId) => ({
        outfit_id: outfit.id,
        clothing_item_id: clothingItemId,
      }));

      const { error: itemsError } = await supabase
        .from('outfit_items')
        .insert(outfitItems);

      if (itemsError) throw itemsError;

      toast({
        title: t('aiOutfitGenerated'),
        description: suggestion.outfit_name,
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!suggestion ? (
        <>
          {/* Optional inputs */}
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {language === 'es'
                ? 'Opcionalmente, dinos más sobre lo que buscas:'
                : 'Optionally, tell us more about what you\'re looking for:'}
            </p>
            
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="occasion">
                  {language === 'es' ? 'Ocasión' : 'Occasion'}
                </Label>
                <Input
                  id="occasion"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder={language === 'es' ? 'ej: casual, trabajo...' : 'e.g., casual, work...'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weather">
                  {language === 'es' ? 'Clima' : 'Weather'}
                </Label>
                <Input
                  id="weather"
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  placeholder={language === 'es' ? 'ej: calor, frío...' : 'e.g., hot, cold...'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mood">
                  {language === 'es' ? 'Estilo/Mood' : 'Style/Mood'}
                </Label>
                <Input
                  id="mood"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder={language === 'es' ? 'ej: relajado, elegante...' : 'e.g., relaxed, elegant...'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="extraDetails">
                {language === 'es' ? 'Detalles adicionales' : 'Extra details'}
              </Label>
              <Input
                id="extraDetails"
                value={extraDetails}
                onChange={(e) => setExtraDetails(e.target.value)}
                placeholder={language === 'es' ? 'ej: sin chaquetas, colores oscuros, marcas específicas...' : 'e.g., no jackets, dark colors, specific brands...'}
              />
              <p className="text-xs text-muted-foreground">
                {language === 'es' 
                  ? 'Especifica prendas a excluir, colores preferidos, o cualquier detalle extra'
                  : 'Specify pieces to exclude, preferred colors, or any other details'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleGenerate} 
              disabled={generating}
              className="flex-1 gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('generatingOutfit')}
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  {language === 'es' ? 'Generar Outfit' : 'Generate Outfit'}
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Show AI suggestion */}
          <Card className="border-accent/50 bg-accent/5">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2 text-accent">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-display font-semibold">{suggestion.outfit_name}</h3>
              </div>

              {/* Items preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {suggestion.items.map((item) => (
                  <div key={item.id} className="relative">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    <p className="text-xs text-center mt-1 truncate">{item.name}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-sm">
                  <strong>{language === 'es' ? 'Por qué funciona:' : 'Why it works:'}</strong>{' '}
                  {suggestion.explanation}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>{language === 'es' ? 'Tips:' : 'Styling tips:'}</strong>{' '}
                  {suggestion.styling_tips}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSuggestion(null)} className="flex-1">
              {language === 'es' ? 'Generar otro' : 'Generate another'}
            </Button>
            <Button 
              onClick={handleSaveOutfit} 
              disabled={saving}
              className="flex-1 gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {t('save')}
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
