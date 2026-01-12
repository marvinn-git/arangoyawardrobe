import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, Edit2 } from 'lucide-react';

interface UsernameEditorProps {
  language: 'en' | 'es';
  currentUsername: string;
  usernameLastChanged: string | null;
  onUsernameUpdate: (newUsername: string) => void;
}

export default function UsernameEditor({
  language,
  currentUsername,
  usernameLastChanged,
  onUsernameUpdate,
}: UsernameEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(currentUsername);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  const DAYS_BETWEEN_CHANGES = 30;

  const canChangeUsername = (): { allowed: boolean; daysRemaining: number } => {
    if (!usernameLastChanged) return { allowed: true, daysRemaining: 0 };
    
    const lastChanged = new Date(usernameLastChanged);
    const now = new Date();
    const diffTime = now.getTime() - lastChanged.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, DAYS_BETWEEN_CHANGES - diffDays);
    
    return { allowed: diffDays >= DAYS_BETWEEN_CHANGES, daysRemaining };
  };

  const { allowed, daysRemaining } = canChangeUsername();

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

  const checkAvailability = async (value: string) => {
    if (!value || validateUsername(value) || value === currentUsername) return;
    
    setChecking(true);
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', value.toLowerCase())
      .maybeSingle();
    
    setChecking(false);
    
    if (data) {
      setError(language === 'es' ? 'Usuario no disponible' : 'Username not available');
    }
  };

  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9._]/g, '');
    setNewUsername(cleaned);
    setError(validateUsername(cleaned));
  };

  const handleSave = async () => {
    if (!user || error || newUsername === currentUsername) return;
    
    setSaving(true);
    try {
      // Check availability one more time
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', newUsername.toLowerCase())
        .neq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        setError(language === 'es' ? 'Usuario no disponible' : 'Username not available');
        return;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          username: newUsername.toLowerCase(),
          username_last_changed: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      onUsernameUpdate(newUsername.toLowerCase());
      setIsEditing(false);
      toast({
        title: language === 'es' ? '¡Usuario actualizado!' : 'Username updated!',
      });
    } catch (err: any) {
      toast({
        title: language === 'es' ? 'Error' : 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNewUsername(currentUsername);
    setError('');
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="space-y-2">
        <Label htmlFor="username">
          {language === 'es' ? 'Nombre de usuario' : 'Username'}
        </Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              id="username"
              value={currentUsername}
              disabled
              className="pl-8 bg-muted"
            />
          </div>
          {allowed ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        {!allowed && (
          <p className="text-xs text-muted-foreground">
            {language === 'es' 
              ? `Puedes cambiar tu usuario en ${daysRemaining} días` 
              : `You can change your username in ${daysRemaining} days`}
          </p>
        )}
        {allowed && (
          <p className="text-xs text-muted-foreground">
            {language === 'es' 
              ? 'Puedes cambiar tu usuario (1 vez cada 30 días)' 
              : 'You can change your username (once every 30 days)'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="username">
        {language === 'es' ? 'Nuevo nombre de usuario' : 'New username'}
      </Label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
          <Input
            id="username"
            value={newUsername}
            onChange={(e) => handleUsernameChange(e.target.value)}
            onBlur={() => checkAvailability(newUsername)}
            className={`pl-8 ${error ? 'border-destructive' : ''}`}
            disabled={saving}
          />
          {checking && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          type="button"
          size="icon"
          variant="default"
          onClick={handleSave}
          disabled={saving || !!error || newUsername === currentUsername}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={handleCancel}
          disabled={saving}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-amber-600">
        {language === 'es' 
          ? '⚠️ Solo puedes cambiar tu usuario una vez cada 30 días' 
          : '⚠️ You can only change your username once every 30 days'}
      </p>
    </div>
  );
}
