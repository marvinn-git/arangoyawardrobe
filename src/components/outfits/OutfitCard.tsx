import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2, Star, AlertCircle } from 'lucide-react';

interface ClothingItem {
  id: string;
  name: string;
  image_url: string;
}

interface Outfit {
  id: string;
  name: string;
  photo_url: string | null;
  is_favorite: boolean;
  tags: string[] | null;
  items: ClothingItem[];
  isComplete: boolean;
}

interface OutfitCardProps {
  outfit: Outfit;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function OutfitCard({
  outfit,
  onToggleFavorite,
  onEdit,
  onDelete,
}: OutfitCardProps) {
  const { t, language } = useLanguage();

  return (
    <Card className="group overflow-hidden card-elevated">
      {/* Image preview grid */}
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {outfit.photo_url ? (
          <img
            src={outfit.photo_url}
            alt={outfit.name}
            className="h-full w-full object-cover"
          />
        ) : outfit.items.length > 0 ? (
          <div className="grid h-full w-full grid-cols-2 gap-0.5 p-0.5">
            {outfit.items.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="overflow-hidden bg-background"
              >
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
            {outfit.items.length < 4 &&
              Array.from({ length: 4 - outfit.items.length }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-muted" />
              ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No items
          </div>
        )}

        {/* Incomplete badge */}
        {!outfit.isComplete && (
          <Badge 
            variant="destructive" 
            className="absolute left-2 bottom-2 gap-1"
          >
            <AlertCircle className="h-3 w-3" />
            {t('outfitToMake')}
          </Badge>
        )}

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
              outfit.is_favorite ? 'fill-accent text-accent' : ''
            }`}
          />
        </Button>

        {/* Menu */}
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
      </div>

      <div className="p-4">
        <h3 className="font-medium truncate">{outfit.name}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {outfit.items.length} {outfit.items.length === 1 ? 'item' : 'items'}
        </p>
        
        {outfit.tags && outfit.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {outfit.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {outfit.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{outfit.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
