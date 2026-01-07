import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowUpCircle, Loader2, Star, Plus, RefreshCw, ShoppingBag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OutfitOption {
  id: string;
  name: string;
}

interface AIUpgradeProps {
  outfits: OutfitOption[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AIOutfitUpgrade({ outfits, onSuccess, onCancel }: AIUpgradeProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [analyzing, setAnalyzing] = useState(false);
  const [selectedOutfitId, setSelectedOutfitId] = useState('');
  const [upgradePreference, setUpgradePreference] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!user || !selectedOutfitId) return;

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upgrade-outfit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ outfitId: selectedOutfitId, upgradePreference }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze outfit');
      }

      setAnalysis(data);
    } catch (error: any) {
      toast({
        title: t('aiError'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  if (outfits.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {language === 'es' 
            ? 'Primero crea un outfit para poder mejorarlo con IA'
            : 'Create an outfit first to upgrade it with AI'}
        </p>
        <Button onClick={onCancel} className="mt-4">{t('cancel')}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!analysis ? (
        <>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'es' ? 'Selecciona un outfit' : 'Select an outfit'}</Label>
              <Select value={selectedOutfitId} onValueChange={setSelectedOutfitId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'es' ? 'Elige un outfit...' : 'Choose an outfit...'} />
                </SelectTrigger>
                <SelectContent>
                  {outfits.map((outfit) => (
                    <SelectItem key={outfit.id} value={outfit.id}>{outfit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{language === 'es' ? 'Preferencias de mejora (opcional)' : 'Upgrade preferences (optional)'}</Label>
              <Input
                value={upgradePreference}
                onChange={(e) => setUpgradePreference(e.target.value)}
                placeholder={language === 'es' ? 'ej: más elegante, añadir capas...' : 'e.g., more elegant, add layers...'}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} className="flex-1">{t('cancel')}</Button>
            <Button onClick={handleAnalyze} disabled={analyzing || !selectedOutfitId} className="flex-1 gap-2">
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpCircle className="h-4 w-4" />}
              {language === 'es' ? 'Analizar' : 'Analyze'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Card className={analysis.analysis.is_already_great ? "border-green-500/50 bg-green-500/5" : "border-accent/50 bg-accent/5"}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold">{analysis.outfit.name}</h3>
                <Badge variant={analysis.analysis.current_rating >= 8 ? "default" : "secondary"}>
                  <Star className="h-3 w-3 mr-1" />
                  {analysis.analysis.current_rating}/10
                </Badge>
              </div>

              <p className="text-sm"><strong>{language === 'es' ? 'Análisis:' : 'Analysis:'}</strong> {analysis.analysis.current_analysis}</p>
              <p className="text-sm text-muted-foreground"><strong>{language === 'es' ? 'Mejoras:' : 'Improvements:'}</strong> {analysis.analysis.improvement_areas}</p>
              <p className="text-sm"><strong>{language === 'es' ? 'Tips:' : 'Styling tips:'}</strong> {analysis.analysis.styling_tips}</p>

              {analysis.analysis.suggestedItems?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2"><Plus className="h-3 w-3 inline mr-1" />{language === 'es' ? 'Añadir:' : 'Add:'}</p>
                  <div className="flex gap-2 flex-wrap">
                    {analysis.analysis.suggestedItems.map((item: any) => (
                      <div key={item.id} className="w-16">
                        <img src={item.image_url} alt={item.name} className="w-full aspect-square object-cover rounded" />
                        <p className="text-xs truncate mt-1">{item.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.analysis.shopping_suggestions && (
                <p className="text-sm text-muted-foreground"><ShoppingBag className="h-3 w-3 inline mr-1" />{analysis.analysis.shopping_suggestions}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAnalysis(null)} className="flex-1 gap-2">
              <RefreshCw className="h-4 w-4" />{language === 'es' ? 'Analizar otro' : 'Analyze another'}
            </Button>
            <Button onClick={onSuccess} className="flex-1">{language === 'es' ? 'Listo' : 'Done'}</Button>
          </div>
        </>
      )}
    </div>
  );
}
