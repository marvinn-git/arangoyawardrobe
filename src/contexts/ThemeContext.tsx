import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ThemeName = 'warm-neutral' | 'ocean-breeze' | 'forest-moss' | 'midnight-purple';
export type BackgroundStyle = 'default' | 'soft-gray' | 'cream' | 'light-blue' | 'mint' | 'lavender' | 'peach';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  backgroundStyle: BackgroundStyle;
  setBackgroundStyle: (style: BackgroundStyle) => void;
  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const themes: { id: ThemeName; nameEn: string; nameEs: string; preview: string }[] = [
  { id: 'warm-neutral', nameEn: 'Warm Neutral', nameEs: 'Neutro Cálido', preview: 'bg-gradient-to-br from-amber-100 to-orange-100' },
  { id: 'ocean-breeze', nameEn: 'Ocean Breeze', nameEs: 'Brisa Marina', preview: 'bg-gradient-to-br from-cyan-100 to-blue-200' },
  { id: 'forest-moss', nameEn: 'Forest Moss', nameEs: 'Bosque Musgo', preview: 'bg-gradient-to-br from-emerald-100 to-green-200' },
  { id: 'midnight-purple', nameEn: 'Midnight Purple', nameEs: 'Púrpura Nocturno', preview: 'bg-gradient-to-br from-purple-200 to-violet-300' },
];

export const backgroundStyles: { id: BackgroundStyle; nameEn: string; nameEs: string; color: string; darkColor: string }[] = [
  { id: 'default', nameEn: 'Default', nameEs: 'Por defecto', color: 'hsl(40 20% 98%)', darkColor: 'hsl(30 15% 8%)' },
  { id: 'soft-gray', nameEn: 'Soft Gray', nameEs: 'Gris Suave', color: 'hsl(220 15% 96%)', darkColor: 'hsl(220 15% 10%)' },
  { id: 'cream', nameEn: 'Cream', nameEs: 'Crema', color: 'hsl(45 40% 96%)', darkColor: 'hsl(45 20% 8%)' },
  { id: 'light-blue', nameEn: 'Light Blue', nameEs: 'Azul Claro', color: 'hsl(210 40% 96%)', darkColor: 'hsl(210 30% 10%)' },
  { id: 'mint', nameEn: 'Mint', nameEs: 'Menta', color: 'hsl(160 30% 95%)', darkColor: 'hsl(160 20% 8%)' },
  { id: 'lavender', nameEn: 'Lavender', nameEs: 'Lavanda', color: 'hsl(270 30% 96%)', darkColor: 'hsl(270 20% 10%)' },
  { id: 'peach', nameEn: 'Peach', nameEs: 'Melocotón', color: 'hsl(20 50% 96%)', darkColor: 'hsl(20 30% 9%)' },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeName>('warm-neutral');
  const [backgroundStyle, setBackgroundStyleState] = useState<BackgroundStyle>('default');
  const [darkMode, setDarkModeState] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('theme, background_style, dark_mode')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.theme && isValidTheme(data.theme)) {
        setThemeState(data.theme as ThemeName);
      }
      if (data?.background_style && isValidBackground(data.background_style)) {
        setBackgroundStyleState(data.background_style as BackgroundStyle);
      }
      if (data?.dark_mode !== undefined) {
        setDarkModeState(data.dark_mode);
      }
    };

    loadSettings();
  }, [user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-bg', backgroundStyle);
  }, [backgroundStyle]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const setTheme = async (newTheme: ThemeName) => {
    setThemeState(newTheme);
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ theme: newTheme })
        .eq('user_id', user.id);
    }
  };

  const setBackgroundStyle = async (newStyle: BackgroundStyle) => {
    setBackgroundStyleState(newStyle);
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ background_style: newStyle })
        .eq('user_id', user.id);
    }
  };

  const setDarkMode = async (enabled: boolean) => {
    setDarkModeState(enabled);
    
    if (user) {
      await supabase
        .from('profiles')
        .update({ dark_mode: enabled })
        .eq('user_id', user.id);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, backgroundStyle, setBackgroundStyle, darkMode, setDarkMode }}>
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

function isValidBackground(bg: string): bg is BackgroundStyle {
  return ['default', 'soft-gray', 'cream', 'light-blue', 'mint', 'lavender', 'peach'].includes(bg);
}
