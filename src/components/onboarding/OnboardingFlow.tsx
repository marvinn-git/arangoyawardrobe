import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SearchableChipSelector } from '@/components/ui/searchable-chip-selector';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Shirt, User, Sparkles, ChevronRight, ChevronLeft, Check, Wand2, ArrowUpCircle, SkipForward, Camera, Loader2 } from 'lucide-react';
import BodyMeasurementsStep from './BodyMeasurementsStep';

interface StyleTag {
  id: string;
  name: string;
  name_es: string | null;
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'profile' | 'measurements' | 'style' | 'clothing-intro' | 'ai-intro' | 'complete';

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('welcome');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Profile data
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [yearOfBirth, setYearOfBirth] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Body measurements
  const [chestCm, setChestCm] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [hipsCm, setHipsCm] = useState('');
  const [shoulderWidthCm, setShoulderWidthCm] = useState('');
  const [inseamCm, setInseamCm] = useState('');

  // Style tags
  const [allStyleTags, setAllStyleTags] = useState<StyleTag[]>([]);
  const [selectedStyleTagIds, setSelectedStyleTagIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchStyleTags = async () => {
      const { data } = await supabase
        .from('style_tags')
        .select('*')
        .order('name');
      if (data) setAllStyleTags(data);
    };
    fetchStyleTags();
  }, []);

  const steps: Step[] = ['welcome', 'profile', 'measurements', 'style', 'clothing-intro', 'ai-intro', 'complete'];
  const currentIndex = steps.indexOf(step);
  const progress = ((currentIndex) / (steps.length - 1)) * 100;

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
      title: language === 'es' ? 'Selecciona de las opciones disponibles' : 'Select from available options',
      description: language === 'es' ? 'Podrás personalizar más tarde' : 'You can customize later',
    });
  };

  const validateUsername = (value: string) => {
    if (value.length < 4) {
      return language === 'es' ? 'Mínimo 4 caracteres' : 'Minimum 4 characters';
    }
    if (!/^[a-zA-Z0-9._]+$/.test(value)) {
      return language === 'es' 
        ? 'Solo letras, números, puntos y guiones bajos' 
        : 'Only letters, numbers, dots and underscores';
    }
    return '';
  };

  const checkUsernameAvailability = async (value: string) => {
    if (!value || validateUsername(value)) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', value.toLowerCase())
      .maybeSingle();
    
    if (data) {
      setUsernameError(language === 'es' ? 'Usuario no disponible' : 'Username not available');
    }
  };

  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9._]/g, '');
    setUsername(cleaned);
    setUsernameError(validateUsername(cleaned));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('clothing-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = await supabase.storage
        .from('clothing-images')
        .createSignedUrl(filePath, 60 * 60 * 24 * 30); // 30 days expiration

      if (urlData?.signedUrl) {
        await supabase
          .from('profiles')
          .update({ avatar_url: urlData.signedUrl })
          .eq('user_id', user.id);

        setAvatarUrl(urlData.signedUrl);
        toast({
          title: language === 'es' ? '¡Foto subida!' : 'Photo uploaded!',
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

  const handleNext = async () => {
    if (step === 'profile') {
      if (!name.trim()) {
        toast({
          title: t('error'),
          description: language === 'es' ? 'El nombre es requerido' : 'Name is required',
          variant: 'destructive',
        });
        return;
      }

      const usernameValidation = validateUsername(username);
      if (usernameValidation) {
        setUsernameError(usernameValidation);
        toast({
          title: t('error'),
          description: usernameValidation,
          variant: 'destructive',
        });
        return;
      }

      // Check username availability
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      if (existingUser) {
        setUsernameError(language === 'es' ? 'Usuario no disponible' : 'Username not available');
        toast({
          title: t('error'),
          description: language === 'es' ? 'Usuario no disponible' : 'Username not available',
          variant: 'destructive',
        });
        return;
      }

      if (!yearOfBirth) {
        toast({
          title: t('error'),
          description: language === 'es' ? 'El año de nacimiento es requerido' : 'Year of birth is required',
          variant: 'destructive',
        });
        return;
      }

      const year = parseInt(yearOfBirth);
      if (year < 1900 || year > new Date().getFullYear() - 13) {
        toast({
          title: t('error'),
          description: language === 'es' ? 'Año de nacimiento no válido' : 'Invalid year of birth',
          variant: 'destructive',
        });
        return;
      }
    }

    if (step === 'style') {
      if (selectedStyleTagIds.length < 3) {
        toast({
          title: t('error'),
          description: t('selectStyleTags'),
          variant: 'destructive',
        });
        return;
      }
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Save profile with measurements
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          username: username.toLowerCase(),
          year_of_birth: parseInt(yearOfBirth),
          height_cm: heightCm ? parseFloat(heightCm) : null,
          weight_kg: weightKg ? parseFloat(weightKg) : null,
          chest_cm: chestCm ? parseFloat(chestCm) : null,
          waist_cm: waistCm ? parseFloat(waistCm) : null,
          hips_cm: hipsCm ? parseFloat(hipsCm) : null,
          shoulder_width_cm: shoulderWidthCm ? parseFloat(shoulderWidthCm) : null,
          inseam_cm: inseamCm ? parseFloat(inseamCm) : null,
          onboarding_completed: true,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Save style tags
      await supabase.from('user_style_tags').delete().eq('user_id', user.id);
      
      const tagsToInsert = selectedStyleTagIds.map((tagId) => ({
        user_id: user.id,
        style_tag_id: tagId,
      }));

      const { error: tagsError } = await supabase.from('user_style_tags').insert(tagsToInsert);
      if (tagsError) throw tagsError;

      // Seed personalized inspiration content for new user (runs in background)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        // Get style names for personalization
        const userStyleNames = selectedStyleTagIds
          .map(id => allStyleTags.find(t => t.id === id)?.name)
          .filter(Boolean) as string[];
        
        fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-inspiration`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              userStyles: userStyleNames,
            }),
          }
        ).catch((err) => console.log('Inspiration seeding started in background:', err));
      }

      toast({
        title: t('success'),
        description: language === 'es' ? '¡Perfil completado!' : 'Profile completed!',
      });

      onComplete();
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSkipToEnd = async () => {
    if (step === 'clothing-intro' || step === 'ai-intro') {
      setStep('complete');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Progress */}
      {step !== 'welcome' && step !== 'complete' && (
        <div className="w-full max-w-md mb-6">
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Welcome */}
      {step === 'welcome' && (
        <Card className="w-full max-w-md card-elevated animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <Shirt className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">
              {language === 'es' ? '¡Bienvenido a tu Armario!' : 'Welcome to your Wardrobe!'}
            </CardTitle>
            <CardDescription>
              {language === 'es' 
                ? 'Vamos a configurar tu perfil y estilo personal' 
                : "Let's set up your profile and personal style"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={language === 'en' ? 'default' : 'outline'}
                onClick={() => setLanguage('en')}
                className="flex-1"
              >
                English
              </Button>
              <Button
                variant={language === 'es' ? 'default' : 'outline'}
                onClick={() => setLanguage('es')}
                className="flex-1"
              >
                Español
              </Button>
            </div>
            <Button onClick={handleNext} className="w-full gap-2">
              {language === 'es' ? 'Empezar' : 'Get Started'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Profile Setup */}
      {step === 'profile' && (
        <Card className="w-full max-w-md card-elevated animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">
                  {language === 'es' ? 'Tu Perfil' : 'Your Profile'}
                </CardTitle>
                <CardDescription>
                  {language === 'es' ? 'Cuéntanos sobre ti' : 'Tell us about yourself'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Picture - Prominent */}
            <div className="flex flex-col items-center gap-3 p-4 bg-secondary/30 rounded-xl border-2 border-dashed border-primary/30">
              <div className="relative">
                <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10">
                    {name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
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
              <div className="text-center">
                <p className="text-sm font-medium">
                  {language === 'es' ? 'Añade tu foto de perfil' : 'Add your profile photo'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'es' ? 'Haz clic en el icono de cámara' : 'Click the camera icon'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('name')} *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">
                {language === 'es' ? 'Nombre de usuario' : 'Username'} *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  onBlur={() => checkUsernameAvailability(username)}
                  placeholder="johndoe"
                  className={`pl-8 ${usernameError ? 'border-destructive' : ''}`}
                  required
                />
              </div>
              {usernameError && (
                <p className="text-xs text-destructive">{usernameError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {language === 'es' 
                  ? 'Mínimo 4 caracteres. Solo letras, números, puntos y _' 
                  : 'Min 4 characters. Letters, numbers, dots and _ only'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearOfBirth">
                {language === 'es' ? 'Año de nacimiento' : 'Year of birth'} *
              </Label>
              <Input
                id="yearOfBirth"
                type="number"
                value={yearOfBirth}
                onChange={(e) => setYearOfBirth(e.target.value)}
                placeholder="2000"
                min="1900"
                max={new Date().getFullYear() - 13}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">{t('height')} ({t('optional')})</Label>
                <Input
                  id="height"
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="175"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">{t('weight')} ({t('optional')})</Label>
                <Input
                  id="weight"
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="70"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleBack} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button onClick={handleNext} className="flex-1 gap-2">
                {language === 'es' ? 'Continuar' : 'Continue'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Body Measurements */}
      {step === 'measurements' && (
        <BodyMeasurementsStep
          language={language}
          chestCm={chestCm}
          waistCm={waistCm}
          hipsCm={hipsCm}
          shoulderWidthCm={shoulderWidthCm}
          inseamCm={inseamCm}
          onChestChange={setChestCm}
          onWaistChange={setWaistCm}
          onHipsChange={setHipsCm}
          onShoulderChange={setShoulderWidthCm}
          onInseamChange={setInseamCm}
          onBack={handleBack}
          onNext={handleNext}
        />
      )}

      {/* Style Selection */}
      {step === 'style' && (
        <Card className="w-full max-w-lg card-elevated animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle className="font-display">
                  {language === 'es' ? 'Tu Estilo' : 'Your Style'}
                </CardTitle>
                <CardDescription>
                  {t('selectStyleTags')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {selectedStyleTagIds.length} {t('styleTagsCount')} {selectedStyleTagIds.length < 3 ? `(min 3)` : ''}
              </span>
            </div>
            <SearchableChipSelector
              options={allStyleTags}
              selectedIds={selectedStyleTagIds}
              onToggle={toggleStyleTag}
              placeholder={language === 'es' ? 'Buscar estilos...' : 'Search styles...'}
              showCreateNew={false}
            />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleBack} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                onClick={handleNext} 
                className="flex-1 gap-2"
                disabled={selectedStyleTagIds.length < 3}
              >
                {language === 'es' ? 'Continuar' : 'Continue'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clothing Intro */}
      {step === 'clothing-intro' && (
        <Card className="w-full max-w-md card-elevated animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <Shirt className="h-8 w-8 text-foreground" />
            </div>
            <CardTitle className="font-display">
              {language === 'es' ? 'Tu Armario' : 'Your Wardrobe'}
            </CardTitle>
            <CardDescription>
              {language === 'es' 
                ? 'Añade tu ropa para crear outfits. Necesitarás al menos una prenda superior (camiseta, jersey...) y una inferior (pantalón, falda...)' 
                : "Add your clothes to create outfits. You'll need at least one top (t-shirt, sweater...) and one bottom (pants, skirt...)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">
                {language === 'es' ? 'Consejo:' : 'Tip:'}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'es' 
                  ? 'Puedes hacer fotos de tu ropa o subirlas desde tu galería. Cuantas más prendas añadas, ¡más outfits podrás crear!' 
                  : 'You can take photos of your clothes or upload them from your gallery. The more clothes you add, the more outfits you can create!'}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleBack} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button onClick={handleNext} className="flex-1 gap-2">
                {language === 'es' ? 'Continuar' : 'Continue'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="ghost" onClick={handleSkipToEnd} className="w-full gap-2 text-muted-foreground">
              <SkipForward className="h-4 w-4" />
              {language === 'es' ? 'Saltar tutorial' : 'Skip tutorial'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* AI Features Intro */}
      {step === 'ai-intro' && (
        <Card className="w-full max-w-md card-elevated animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20">
              <Wand2 className="h-8 w-8 text-accent" />
            </div>
            <CardTitle className="font-display">
              {language === 'es' ? 'IA para tus Outfits' : 'AI for your Outfits'}
            </CardTitle>
            <CardDescription>
              {language === 'es' 
                ? 'Usa inteligencia artificial para crear outfits perfectos' 
                : 'Use artificial intelligence to create perfect outfits'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <Wand2 className="h-5 w-5 text-accent mt-0.5" />
                <div>
                  <p className="font-medium text-sm">
                    {language === 'es' ? 'Crear con IA' : 'Create with AI'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'es' 
                      ? 'La IA seleccionará las mejores combinaciones de tu armario' 
                      : 'AI will select the best combinations from your wardrobe'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <ArrowUpCircle className="h-5 w-5 text-accent mt-0.5" />
                <div>
                  <p className="font-medium text-sm">
                    {language === 'es' ? 'Mejorar Outfit' : 'Upgrade Outfit'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'es' 
                      ? 'Recibe sugerencias de prendas que ya tienes o puedes comprar' 
                      : 'Get suggestions for items you own or can buy'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleBack} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button onClick={handleNext} className="flex-1 gap-2">
                {language === 'es' ? 'Continuar' : 'Continue'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete */}
      {step === 'complete' && (
        <Card className="w-full max-w-md card-elevated animate-fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
              <Check className="h-8 w-8 text-accent-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">
              {language === 'es' ? '¡Todo listo!' : 'All set!'}
            </CardTitle>
            <CardDescription>
              {language === 'es' 
                ? 'Tu perfil está configurado. ¡Empieza a crear tu armario!' 
                : "Your profile is set up. Start building your wardrobe!"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleComplete} disabled={saving} className="w-full gap-2">
              {saving ? t('loading') : (language === 'es' ? 'Ir a mi Armario' : 'Go to my Wardrobe')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
