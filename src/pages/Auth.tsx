import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shirt, Globe } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email();
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const validate = () => {
    const newErrors: typeof errors = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = 'Please enter a valid email';
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    if (isSignUp && password !== confirmPassword) {
      newErrors.confirm = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setSubmitting(true);
    
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, name);
        if (error) {
          // Handle network errors
          if (error.message === 'Failed to fetch' || error.message.includes('network')) {
            toast({
              title: language === 'es' ? 'Error de conexión' : 'Connection Error',
              description: language === 'es' 
                ? 'No se pudo conectar al servidor. Por favor, inténtalo de nuevo.'
                : 'Could not connect to server. Please try again.',
              variant: 'destructive',
            });
          } else if (error.message.includes('already registered')) {
            toast({
              title: t('error'),
              description: 'This email is already registered. Please sign in instead.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: t('error'),
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: t('success'),
            description: t('signupSuccess'),
          });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          // Handle network errors
          if (error.message === 'Failed to fetch' || error.message.includes('network')) {
            toast({
              title: language === 'es' ? 'Error de conexión' : 'Connection Error',
              description: language === 'es' 
                ? 'No se pudo conectar al servidor. Por favor, inténtalo de nuevo.'
                : 'Could not connect to server. Please try again.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: t('error'),
              description: 'Invalid email or password',
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: t('success'),
            description: t('loginSuccess'),
          });
        }
      }
    } catch (err) {
      // Catch any unexpected errors including network failures
      if (import.meta.env.DEV) {
        console.error('Auth error:', err);
      }
      toast({
        title: language === 'es' ? 'Error de conexión' : 'Connection Error',
        description: language === 'es' 
          ? 'No se pudo conectar al servidor. Por favor, inténtalo de nuevo.'
          : 'Could not connect to server. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Language Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleLanguage}
        className="absolute right-4 top-4 gap-2"
      >
        <Globe className="h-4 w-4" />
        {language === 'en' ? 'ES' : 'EN'}
      </Button>

      <div className="mb-8 flex flex-col items-center animate-fade-in">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <Shirt className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          {t('welcome')}
        </h1>
      </div>

      <Card className="w-full max-w-md card-elevated animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">
            {isSignUp ? t('signUp') : t('signIn')}
          </CardTitle>
          <CardDescription>
            {isSignUp ? t('hasAccount') : t('noAccount')}{' '}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrors({});
              }}
              className="text-accent hover:underline font-medium"
            >
              {isSignUp ? t('signIn') : t('signUp')}
            </button>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">{t('name')}</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required={isSignUp}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>
            
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required={isSignUp}
                />
                {errors.confirm && (
                  <p className="text-sm text-destructive">{errors.confirm}</p>
                )}
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? (isSignUp ? t('signingUp') : t('signingIn'))
                : (isSignUp ? t('signUp') : t('signIn'))}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}