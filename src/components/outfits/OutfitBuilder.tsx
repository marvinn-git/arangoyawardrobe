import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X, Plus, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClothingItem {
  id: string;
  name: string;
  image_url: string;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  is_top: boolean;
  is_bottom: boolean;
}

interface Outfit {
  id: string;
  name: string;
  is_favorite: boolean;
  tags: string[] | null;
  items: ClothingItem[];
}

interface OutfitBuilderProps {
  clothes: ClothingItem[];
  categories: Category[];
  editingOutfit: Outfit | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function OutfitBuilder({
  clothes,
  categories,
  editingOutfit,
  onSuccess,
  onCancel,
}: OutfitBuilderProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [name, setName] = useState(editingOutfit?.name || '');
  const [selectedItems, setSelectedItems] = useState<string[]>(
    editingOutfit?.items.map((i) => i.id) || []
  );
  const [isFavorite, setIsFavorite] = useState(editingOutfit?.is_favorite || false);
  const [tags, setTags] = useState<string[]>(editingOutfit?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check if outfit has top and bottom
  const selectedClothes = clothes.filter((c) => selectedItems.includes(c.id));
  const hasTop = selectedClothes.some((item) => {
    const cat = categories.find((c) => c.id === item.category_id);
    return cat?.is_top;
  });
  const hasBottom = selectedClothes.some((item) => {
    const cat = categories.find((c) => c.id === item.category_id);
    return cat?.is_bottom;
  });
  const isComplete = hasTop && hasBottom;

  const toggleItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!name.trim()) {
      toast({ title: t('error'), description: t('required') + ': ' + t('outfitName'), variant: 'destructive' });
      return;
    }

    if (selectedItems.length === 0) {
      toast({ title: t('error'), description: t('selectItems'), variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      if (editingOutfit) {
        // Update outfit
        const { error: outfitError } = await supabase
          .from('outfits')
          .update({
            name: name.trim(),
            is_favorite: isFavorite,
            tags: tags.length > 0 ? tags : null,
          })
          .eq('id', editingOutfit.id);

        if (outfitError) throw outfitError;

        // Delete old items and insert new ones
        await supabase.from('outfit_items').delete().eq('outfit_id', editingOutfit.id);
        
        const itemsToInsert = selectedItems.map((itemId) => ({
          outfit_id: editingOutfit.id,
          clothing_item_id: itemId,
        }));

        const { error: itemsError } = await supabase.from('outfit_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        toast({ title: t('success'), description: t('outfitUpdated') });
      } else {
        // Create new outfit
        const { data: newOutfit, error: outfitError } = await supabase
          .from('outfits')
          .insert({
            user_id: user.id,
            name: name.trim(),
            is_favorite: isFavorite,
            tags: tags.length > 0 ? tags : null,
          })
          .select()
          .single();

        if (outfitError) throw outfitError;

        // Insert outfit items
        const itemsToInsert = selectedItems.map((itemId) => ({
          outfit_id: newOutfit.id,
          clothing_item_id: itemId,
        }));

        const { error: itemsError } = await supabase.from('outfit_items').insert(itemsToInsert);
        if (itemsError) throw itemsError;

        toast({ title: t('success'), description: t('outfitCreated') });
      }

      onSuccess();
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="outfitName">{t('outfitName')} *</Label>
        <Input
          id="outfitName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder={language === 'es' ? 'Outfit casual de verano' : 'Casual summer outfit'}
        />
      </div>

      {/* Outfit status */}
      {selectedItems.length > 0 && (
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-lg',
          isComplete ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
        )}>
          {isComplete ? (
            <Check className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {isComplete ? t('completeOutfit') : t('needsTopAndBottom')}
          </span>
          <div className="ml-auto flex gap-2">
            <Badge variant={hasTop ? 'default' : 'secondary'}>
              {language === 'es' ? 'Top' : 'Top'} {hasTop ? '✓' : '✗'}
            </Badge>
            <Badge variant={hasBottom ? 'default' : 'secondary'}>
              {language === 'es' ? 'Bottom' : 'Bottom'} {hasBottom ? '✓' : '✗'}
            </Badge>
          </div>
        </div>
      )}

      {/* Select Items */}
      <div className="space-y-2">
        <Label>{t('selectItems')} *</Label>
        <div className="rounded-lg border border-border p-4 max-h-64 overflow-y-auto">
          {clothes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {language === 'es' ? 'Primero añade prendas a tu armario' : 'First add clothes to your wardrobe'}
            </p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {clothes.map((item) => {
                const isSelected = selectedItems.includes(item.id);
                const category = categories.find((c) => c.id === item.category_id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className={cn(
                      'relative aspect-square overflow-hidden rounded-lg border-2 transition-all',
                      isSelected
                        ? 'border-accent ring-2 ring-accent/20'
                        : 'border-transparent hover:border-border'
                    )}
                  >
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                        <div className="h-6 w-6 rounded-full bg-accent flex items-center justify-center">
                          <Check className="h-4 w-4 text-accent-foreground" />
                        </div>
                      </div>
                    )}
                    {/* Show top/bottom indicator */}
                    {category && (category.is_top || category.is_bottom) && (
                      <div className="absolute bottom-0 left-0 right-0 bg-background/80 text-[10px] text-center py-0.5">
                        {category.is_top && 'Top'}
                        {category.is_bottom && 'Bottom'}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedItems.length} {language === 'es' ? 'seleccionados' : 'selected'}
        </p>
      </div>

      {/* Favorite */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="favorite"
          checked={isFavorite}
          onCheckedChange={(checked) => setIsFavorite(checked as boolean)}
        />
        <Label htmlFor="favorite" className="cursor-pointer">{t('markFavorite')}</Label>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>{t('tags')}</Label>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder={language === 'es' ? 'casual, verano...' : 'casual, summer...'}
          />
          <Button type="button" variant="outline" size="icon" onClick={addTag}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button type="button" onClick={() => removeTag(tag)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('save')}
        </Button>
      </div>
    </form>
  );
}
