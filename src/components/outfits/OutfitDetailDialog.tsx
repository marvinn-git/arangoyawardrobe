import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Star, Pencil, Trash2, Calendar, Tag, FileText, Shirt } from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

interface ClothingItem {
  id: string;
  name: string;
  image_url: string;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  name_es: string | null;
  is_top: boolean;
  is_bottom: boolean;
}

interface Outfit {
  id: string;
  name: string;
  photo_url: string | null;
  is_favorite: boolean;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  items: ClothingItem[];
  isComplete: boolean;
}

interface OutfitDetailDialogProps {
  outfit: Outfit | null;
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

export default function OutfitDetailDialog({
  outfit,
  categories,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onToggleFavorite,
}: OutfitDetailDialogProps) {
  const { language } = useLanguage();

  if (!outfit) return null;

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return null;
    return language === 'es' && cat.name_es ? cat.name_es : cat.name;
  };

  const createdDate = format(new Date(outfit.created_at), 'PPP', {
    locale: language === 'es' ? es : enUS,
  });

  // Group items by category type
  const tops = outfit.items.filter((item) => {
    const cat = categories.find((c) => c.id === item.category_id);
    return cat?.is_top;
  });
  const bottoms = outfit.items.filter((item) => {
    const cat = categories.find((c) => c.id === item.category_id);
    return cat?.is_bottom;
  });
  const accessories = outfit.items.filter((item) => {
    const cat = categories.find((c) => c.id === item.category_id);
    return !cat?.is_top && !cat?.is_bottom;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="font-display text-xl truncate">
                {outfit.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {createdDate}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
            >
              <Star
                className={`h-5 w-5 ${
                  outfit.is_favorite ? 'fill-accent text-accent' : ''
                }`}
              />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Main outfit preview */}
            {outfit.photo_url ? (
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-secondary">
                <img
                  src={outfit.photo_url}
                  alt={outfit.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : outfit.items.length > 0 ? (
              <div className="rounded-xl overflow-hidden bg-secondary p-2">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {outfit.items.map((item) => (
                    <div key={item.id} className="flex-shrink-0 w-28 space-y-1">
                      <div className="aspect-square rounded-lg overflow-hidden bg-background">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <p className="text-xs truncate text-center">{item.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Tags */}
            {outfit.tags && outfit.tags.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  {language === 'es' ? 'Etiquetas' : 'Tags'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {outfit.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {outfit.notes && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {language === 'es' ? 'Notas' : 'Notes'}
                </div>
                <p className="text-sm bg-secondary/50 rounded-lg p-3">
                  {outfit.notes}
                </p>
              </div>
            )}

            <Separator />

            {/* Items breakdown */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Shirt className="h-4 w-4" />
                {language === 'es' ? 'Prendas del outfit' : 'Outfit items'} ({outfit.items.length})
              </div>

              {/* Tops */}
              {tops.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {language === 'es' ? 'Parte superior' : 'Tops'}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {tops.map((item) => (
                      <div key={item.id} className="space-y-1">
                        <div className="aspect-square rounded-lg overflow-hidden bg-secondary">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="text-xs truncate">{item.name}</p>
                        {getCategoryName(item.category_id) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {getCategoryName(item.category_id)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottoms */}
              {bottoms.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {language === 'es' ? 'Parte inferior' : 'Bottoms'}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {bottoms.map((item) => (
                      <div key={item.id} className="space-y-1">
                        <div className="aspect-square rounded-lg overflow-hidden bg-secondary">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="text-xs truncate">{item.name}</p>
                        {getCategoryName(item.category_id) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {getCategoryName(item.category_id)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accessories */}
              {accessories.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {language === 'es' ? 'Accesorios' : 'Accessories'}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {accessories.map((item) => (
                      <div key={item.id} className="space-y-1">
                        <div className="aspect-square rounded-lg overflow-hidden bg-secondary">
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="text-xs truncate">{item.name}</p>
                        {getCategoryName(item.category_id) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {getCategoryName(item.category_id)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onEdit} className="flex-1 gap-2">
            <Pencil className="h-4 w-4" />
            {language === 'es' ? 'Editar' : 'Edit'}
          </Button>
          <Button
            variant="outline"
            onClick={onDelete}
            className="text-destructive hover:text-destructive gap-2"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}