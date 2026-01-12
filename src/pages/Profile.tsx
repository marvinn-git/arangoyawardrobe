import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SearchableChipSelector } from '@/components/ui/searchable-chip-selector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, Loader2, Camera } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  username: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  avatar_url: string | null;
  style_preferences: string | null;
  preferred_language: 'en' | 'es';
  year_of_birth: number | null;
}

interface StyleTag {
  id: string;
  name: string;
  name_es: string | null;
}

export default function Profile() {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [yearOfBirth, setYearOfBirth] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [stylePreferences, setStylePreferences] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'es'>('en');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Style tags
  const [allStyleTags, setAllStyleTags] = useState<StyleTag[]>([]);
  const [selectedStyleTagIds, setSelectedStyleTagIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch profile, style tags, and user's selected tags in parallel
      const [profileRes, tagsRes, userTagsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('style_tags')
          .select('*')
          .order('name'),
        supabase
          .from('user_style_tags')
          .select('style_tag_id')
          .eq('user_id', user.id),
      ]);

      if (profileRes.data) {
        const data = profileRes.data;
        setProfile(data as Profile);
        setName(data.name || '');
        setUsername(data.username || '');
        setYearOfBirth(data.year_of_birth?.toString() || '');
        setHeightCm(data.height_cm?.toString() || '');
        setWeightKg(data.weight_kg?.toString() || '');
        setStylePreferences(data.style_preferences || '');
        setPreferredLanguage((data.preferred_language as 'en' | 'es') || 'en');
        setAvatarUrl(data.avatar_url);
      }

      if (tagsRes.data) {
        setAllStyleTags(tagsRes.data);
      }

      if (userTagsRes.data) {
        setSelectedStyleTagIds(userTagsRes.data.map((t) => t.style_tag_id));
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const toggleStyleTag = (tagId: string) => {
    setSelectedStyleTagIds((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      }
      return [...prev, tagId];
    });
  };

  const handleCreateStyleTag = async (name: string) => {
    toast({
      title: language === 'es' ? 'Etiquetas personalizadas' : 'Custom tags',
      description: language === 'es' 
        ? 'Las etiquetas personalizadas estarán disponibles pronto' 
        : 'Custom tags will be available soon',
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('clothing-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('clothing-images')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      if (urlData?.signedUrl) {
        // Update profile
        await supabase
          .from('profiles')
          .update({ avatar_url: urlData.signedUrl })
          .eq('user_id', user.id);

        setAvatarUrl(urlData.signedUrl);
        toast({
          title: language === 'es' ? '¡Foto actualizada!' : 'Photo updated!',
        });
      }
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate minimum 3 style tags
    if (selectedStyleTagIds.length < 3) {
      toast({ 
        title: t('error'), 
        description: t('selectStyleTags'), 
        variant: 'destructive' 
      });
      return;
    }

    setSaving(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          year_of_birth: yearOfBirth ? parseInt(yearOfBirth) : null,
          height_cm: heightCm ? parseFloat(heightCm) : null,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          style_preferences: stylePreferences.trim() || null,
          preferred_language: preferredLanguage,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Update style tags - delete old and insert new
      await supabase.from('user_style_tags').delete().eq('user_id', user.id);
      
      const tagsToInsert = selectedStyleTagIds.map((tagId) => ({
        user_id: user.id,
        style_tag_id: tagId,
      }));

      const { error: tagsError } = await supabase.from('user_style_tags').insert(tagsToInsert);
      if (tagsError) throw tagsError;

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
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="text-xl">
                    {name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="sr-only"
                />
              </div>
              <div>
                <p className="font-medium">{name || user?.email}</p>
                <p className="text-sm text-muted-foreground">
                  @{username || (language === 'es' ? 'sin usuario' : 'no username')}
                </p>
              </div>
            </div>

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

            {/* Username (read-only after set) */}
            <div className="space-y-2">
              <Label htmlFor="username">
                {language === 'es' ? 'Nombre de usuario' : 'Username'}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="username"
                  value={username}
                  disabled
                  className="pl-8 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'es' 
                  ? 'El nombre de usuario no se puede cambiar' 
                  : 'Username cannot be changed'}
              </p>
            </div>

            {/* Year of Birth */}
            <div className="space-y-2">
              <Label htmlFor="yearOfBirth">
                {language === 'es' ? 'Año de nacimiento' : 'Year of birth'}
              </Label>
              <Input
                id="yearOfBirth"
                type="number"
                value={yearOfBirth}
                onChange={(e) => setYearOfBirth(e.target.value)}
                placeholder="2000"
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

            {/* Style Tags - Required */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>{t('styleTagsRequired')} *</Label>
                <Badge variant={selectedStyleTagIds.length >= 3 ? "default" : "secondary"}>
                  {selectedStyleTagIds.length} {t('styleTagsCount')} {selectedStyleTagIds.length < 3 ? `(min 3)` : ''}
                </Badge>
              </div>
              <SearchableChipSelector
                options={allStyleTags}
                selectedIds={selectedStyleTagIds}
                onToggle={toggleStyleTag}
                onCreateNew={handleCreateStyleTag}
                placeholder={language === 'es' ? 'Buscar estilos...' : 'Search styles...'}
                showCreateNew={false}
              />
            </div>

            {/* Additional Notes - Optional */}
            <div className="space-y-2">
              <Label htmlFor="stylePreferences">{t('additionalNotes')}</Label>
              <Textarea
                id="stylePreferences"
                value={stylePreferences}
                onChange={(e) => setStylePreferences(e.target.value)}
                placeholder={
                  language === 'es'
                    ? 'Notas adicionales sobre tu estilo...'
                    : 'Additional notes about your style...'
                }
                rows={2}
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
