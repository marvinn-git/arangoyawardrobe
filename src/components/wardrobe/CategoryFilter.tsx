import { Language } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Category {
  id: string;
  name: string;
  name_es: string | null;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
  language: Language;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelect,
  language,
}: CategoryFilterProps) {
  const { t } = useLanguage();

  const selectedName = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[140px]">
          <Filter className="h-4 w-4" />
          {selectedName
            ? (language === 'es' && selectedName.name_es ? selectedName.name_es : selectedName.name)
            : t('allItems')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onSelect(null)}>
          {!selectedCategory && <Check className="mr-2 h-4 w-4" />}
          <span className={!selectedCategory ? 'font-medium' : ''}>{t('allItems')}</span>
        </DropdownMenuItem>
        {categories.map((category) => (
          <DropdownMenuItem
            key={category.id}
            onClick={() => onSelect(category.id)}
          >
            {selectedCategory === category.id && <Check className="mr-2 h-4 w-4" />}
            <span className={selectedCategory === category.id ? 'font-medium' : ''}>
              {language === 'es' && category.name_es ? category.name_es : category.name}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}