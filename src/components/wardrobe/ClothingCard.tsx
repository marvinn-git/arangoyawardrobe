import { Language } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ClothingItem {
  id: string;
  name: string;
  category_id: string | null;
  size: string | null;
  color: string | null;
  brand: string | null;
  image_url: string;
  is_accessory: boolean;
  is_favorite?: boolean;
}

interface Category {
  id: string;
  name: string;
  name_es: string | null;
}

interface ClothingCardProps {
  item: ClothingItem;
  category?: Category;
  language: Language;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

export default function ClothingCard({
  item,
  category,
  language,
  onEdit,
  onDelete,
  onToggleFavorite,
}: ClothingCardProps) {
  const { t } = useLanguage();
  const categoryName = category
    ? (language === 'es' && category.name_es ? category.name_es : category.name)
    : null;

  return (
    <Card className="group overflow-hidden card-elevated transition-transform duration-200 active:scale-[0.98]">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <img
          src={item.image_url}
          alt={item.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Favorite button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute left-1.5 top-1.5 h-7 w-7 sm:left-2 sm:top-2 sm:h-8 sm:w-8"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
        >
          <Star
            className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
              item.is_favorite ? 'fill-accent text-accent' : ''
            }`}
          />
        </Button>
        
        {/* Overlay menu */}
        <div className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
                <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                {t('edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                {t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Accessory badge */}
        {item.is_accessory && (
          <Badge className="absolute left-1.5 bottom-1.5 sm:left-2 sm:bottom-2 text-[10px] sm:text-xs" variant="secondary">
            {language === 'es' ? 'Acc' : 'Acc'}
          </Badge>
        )}
      </div>

      <div className="p-2 sm:p-3">
        <h3 className="font-medium truncate text-sm sm:text-base">{item.name}</h3>
        <div className="mt-0.5 sm:mt-1 flex flex-wrap items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted-foreground">
          {categoryName && (
            <span className="truncate">{categoryName}</span>
          )}
          {item.size && (
            <>
              {categoryName && <span>•</span>}
              <span>{item.size}</span>
            </>
          )}
        </div>
        {item.color && (
          <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2">
            <div
              className="h-3 w-3 sm:h-4 sm:w-4 rounded-full border border-border flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] sm:text-xs text-muted-foreground capitalize truncate">{item.color}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
