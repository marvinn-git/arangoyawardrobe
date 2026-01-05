import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface Option {
  id: string;
  name: string;
  name_es?: string | null;
  is_top?: boolean;
  is_bottom?: boolean;
}

interface SearchableChipSelectorProps {
  options: Option[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onCreateNew?: (name: string) => Promise<void>;
  maxSelected?: number;
  placeholder?: string;
  showCreateNew?: boolean;
  className?: string;
}

export function SearchableChipSelector({
  options,
  selectedIds,
  onToggle,
  onCreateNew,
  maxSelected,
  placeholder,
  showCreateNew = true,
  className,
}: SearchableChipSelectorProps) {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const searchLower = search.toLowerCase();
    return options.filter((opt) => {
      const name = language === 'es' && opt.name_es ? opt.name_es : opt.name;
      return name.toLowerCase().includes(searchLower);
    });
  }, [options, search, language]);

  const canCreateNew = useMemo(() => {
    if (!showCreateNew || !onCreateNew || !search.trim()) return false;
    const searchLower = search.toLowerCase().trim();
    return !options.some((opt) => {
      const name = language === 'es' && opt.name_es ? opt.name_es : opt.name;
      return name.toLowerCase() === searchLower;
    });
  }, [showCreateNew, onCreateNew, search, options, language]);

  const handleCreateNew = async () => {
    if (!onCreateNew || !search.trim()) return;
    setCreating(true);
    try {
      await onCreateNew(search.trim());
      setSearch('');
    } finally {
      setCreating(false);
    }
  };

  const getName = (opt: Option) => {
    return language === 'es' && opt.name_es ? opt.name_es : opt.name;
  };

  const isDisabled = (id: string) => {
    if (!maxSelected) return false;
    return !selectedIds.includes(id) && selectedIds.length >= maxSelected;
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder || t('typeToSearch')}
          className="pl-10"
        />
      </div>

      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedIds.map((id) => {
            const opt = options.find((o) => o.id === id);
            if (!opt) return null;
            return (
              <Badge
                key={id}
                variant="default"
                className="gap-1 cursor-pointer hover:bg-primary/80"
                onClick={() => onToggle(id)}
              >
                {getName(opt)}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
        </div>
      )}

      {/* Create new option */}
      {canCreateNew && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCreateNew}
          disabled={creating}
          className="gap-2 text-accent"
        >
          <Plus className="h-4 w-4" />
          {t('createNew')}: "{search}"
        </Button>
      )}

      {/* Options grid */}
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-2">
        <div className="flex flex-wrap gap-1.5">
          {filteredOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground px-2 py-4 w-full text-center">
              {t('noResults')}
            </p>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = selectedIds.includes(opt.id);
              const disabled = isDisabled(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => !disabled && onToggle(opt.id)}
                  disabled={disabled}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                    isSelected
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                    disabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                  {getName(opt)}
                </button>
              );
            })
          )}
        </div>
      </div>

      {maxSelected && (
        <p className="text-xs text-muted-foreground">
          {selectedIds.length}/{maxSelected} {language === 'es' ? 'seleccionados' : 'selected'}
        </p>
      )}
    </div>
  );
}
