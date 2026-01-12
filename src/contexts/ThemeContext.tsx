import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ThemeName = 'warm-neutral' | 'ocean-breeze' | 'forest-moss' | 'midnight-purple';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themes: { id: ThemeName; nameEn: string; nameEs: string; preview: string }[] = [
  { id: 'warm-neutral', nameEn: 'Warm Neutral', nameEs: 'Neutro Cálido', preview: 'bg-gradient-to-br from-amber-100 to-orange-100' },
  { id: 'ocean-breeze', nameEn: 'Ocean Breeze', nameEs: 'Brisa Marina', preview: 'bg-gradient-to-br from-cyan-100 to-blue-200' },
  { id: 'forest-moss', nameEn: 'Forest Moss', nameEs: 'Bosque Musgo', preview: 'bg-gradient-to-br from-emerald-100 to-green-200' },
  { id: 'midnight-purple', nameEn: 'Midnight Purple', nameEs: 'Púrpura Nocturno', preview: 'bg-gradient-to-br from-purple-200 to-violet-300' },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeName>('warm-neutral');

  useEffect(() => {
    // Load theme from profile
    const loadTheme = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('theme')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.theme && isValidTheme(data.theme)) {
        setThemeState(data.theme as ThemeName);
      }
    };

    loadTheme();
  }, [user]);

  useEffect(() => {
    // Apply theme class to document
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const setTheme = async (newTheme: ThemeName) => {
    setThemeState(newTheme);
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ theme: newTheme })
        .eq('user_id', user.id);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

function isValidTheme(theme: string): theme is ThemeName {
  return ['warm-neutral', 'ocean-breeze', 'forest-moss', 'midnight-purple'].includes(theme);
}
