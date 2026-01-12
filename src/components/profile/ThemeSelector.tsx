import { useTheme, themes, ThemeName } from '@/contexts/ThemeContext';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Check, Palette } from 'lucide-react';

interface ThemeSelectorProps {
  language: 'en' | 'es';
}

export default function ThemeSelector({ language }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();

  return (
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
  );
}
