import { useTheme, themes, backgroundStyles } from '@/contexts/ThemeContext';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Check, Palette, PaintBucket, Moon, Sun } from 'lucide-react';

interface ThemeSelectorProps {
  language: 'en' | 'es';
}

export default function ThemeSelector({ language }: ThemeSelectorProps) {
  const { theme, setTheme, backgroundStyle, setBackgroundStyle, darkMode, setDarkMode } = useTheme();

  return (
    <div className="space-y-6">
      {/* Dark Mode Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3">
          {darkMode ? (
            <Moon className="h-5 w-5 text-primary" />
          ) : (
            <Sun className="h-5 w-5 text-primary" />
          )}
          <div>
            <Label className="text-base font-medium">
              {language === 'es' ? 'Modo oscuro' : 'Dark Mode'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {language === 'es' 
                ? 'Cambia a una interfaz más oscura' 
                : 'Switch to a darker interface'}
            </p>
          </div>
        </div>
        <Switch
          checked={darkMode}
          onCheckedChange={setDarkMode}
          aria-label={language === 'es' ? 'Alternar modo oscuro' : 'Toggle dark mode'}
        />
      </div>

      {/* Theme Selection */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          {language === 'es' ? 'Tema de la aplicación' : 'App Theme'}
        </Label>
        <div className="grid grid-cols-2 gap-3">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              className={cn(
                'relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                theme === t.id
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className={cn('w-full h-12 rounded-lg', t.preview)} />
              <span className="text-xs font-medium">
                {language === 'es' ? t.nameEs : t.nameEn}
              </span>
              {theme === t.id && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Background Color Selection */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <PaintBucket className="h-4 w-4" />
          {language === 'es' ? 'Color de fondo' : 'Background Color'}
        </Label>
        <div className="grid grid-cols-4 xs:grid-cols-7 gap-2">
          {backgroundStyles.map((bg) => (
            <button
              key={bg.id}
              type="button"
              onClick={() => setBackgroundStyle(bg.id)}
              className={cn(
                'relative flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all',
                backgroundStyle === bg.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              )}
              title={language === 'es' ? bg.nameEs : bg.nameEn}
            >
              <div 
                className="w-8 h-8 rounded-full border border-border/50 shadow-sm"
                style={{ backgroundColor: darkMode ? bg.darkColor : bg.color }}
              />
              {backgroundStyle === bg.id && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {language === 'es' 
            ? 'Selecciona un color de fondo para personalizar tu experiencia' 
            : 'Select a background color to personalize your experience'}
        </p>
      </div>
    </div>
  );
}
