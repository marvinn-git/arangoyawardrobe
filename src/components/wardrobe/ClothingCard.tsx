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
    <Card className="group overflow-hidden card-elevated">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <img
          src={item.image_url}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Favorite button */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute left-2 top-2 h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
        >
          <Star
            className={`h-4 w-4 ${
              item.is_favorite ? 'fill-accent text-accent' : ''
            }`}
          />
        </Button>
        
        {/* Overlay menu */}
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
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
          <Badge className="absolute left-2 bottom-2" variant="secondary">
            {language === 'es' ? 'Accesorio' : 'Accessory'}
          </Badge>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-medium truncate">{item.name}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
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
          <div className="mt-2 flex items-center gap-2">
            <div
              className="h-4 w-4 rounded-full border border-border"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-muted-foreground capitalize">{item.color}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
