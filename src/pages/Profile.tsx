import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  height_cm: number | null;
  weight_kg: number | null;
  avatar_url: string | null;
  style_preferences: string | null;
  preferred_language: 'en' | 'es';
}

export default function Profile() {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [stylePreferences, setStylePreferences] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'es'>('en');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setProfile(data as Profile);
        setName(data.name || '');
        setHeightCm(data.height_cm?.toString() || '');
        setWeightKg(data.weight_kg?.toString() || '');
        setStylePreferences(data.style_preferences || '');
        setPreferredLanguage((data.preferred_language as 'en' | 'es') || 'en');
      }

      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          height_cm: heightCm ? parseFloat(heightCm) : null,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          style_preferences: stylePreferences.trim() || null,
          preferred_language: preferredLanguage,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update app language
      setLanguage(preferredLanguage);

      toast({ title: t('success'), description: t('profileUpdated') });
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold">{t('myProfile')}</h1>
        <p className="text-muted-foreground mt-1">{user?.email}</p>
      </div>

      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <User className="h-5 w-5" />
            {language === 'es' ? 'Información Personal' : 'Personal Information'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            {/* Height & Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">{t('height')}</Label>
                <Input
                  id="height"
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="175"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">{t('weight')}</Label>
                <Input
                  id="weight"
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="70"
                />
              </div>
            </div>

            {/* Style Preferences */}
            <div className="space-y-2">
              <Label htmlFor="stylePreferences">{t('stylePreferences')}</Label>
              <Textarea
                id="stylePreferences"
                value={stylePreferences}
                onChange={(e) => setStylePreferences(e.target.value)}
                placeholder={
                  language === 'es'
                    ? 'Cuéntanos sobre tu estilo: casual, elegante, minimalista...'
                    : 'Tell us about your style: casual, elegant, minimalist...'
                }
                rows={3}
              />
            </div>

            {/* Language */}
            <div className="space-y-2">
              <Label>{t('preferredLanguage')}</Label>
              <Select
                value={preferredLanguage}
                onValueChange={(value: 'en' | 'es') => setPreferredLanguage(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('english')}</SelectItem>
                  <SelectItem value="es">{t('spanish')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('updateProfile')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}