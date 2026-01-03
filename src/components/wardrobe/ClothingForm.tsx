import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, Plus, X, Loader2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  name_es: string | null;
}

interface ClothingItem {
  id: string;
  name: string;
  category_id: string | null;
  size: string | null;
  size_type: string | null;
  color: string | null;
  brand: string | null;
  notes: string | null;
  image_url: string;
  wearing_image_url: string | null;
  is_accessory: boolean;
}

interface ClothingFormProps {
  categories: Category[];
  editingItem: ClothingItem | null;
  onSuccess: () => void;
  onCancel: () => void;
  onCategoryCreated: () => void;
}

export default function ClothingForm({
  categories,
  editingItem,
  onSuccess,
  onCancel,
  onCategoryCreated,
}: ClothingFormProps) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wearingFileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(editingItem?.name || '');
  const [categoryId, setCategoryId] = useState(editingItem?.category_id || '');
  const [size, setSize] = useState(editingItem?.size || '');
  const [sizeType, setSizeType] = useState(editingItem?.size_type || 'letter');
  const [color, setColor] = useState(editingItem?.color || '');
  const [brand, setBrand] = useState(editingItem?.brand || '');
  const [notes, setNotes] = useState(editingItem?.notes || '');
  const [isAccessory, setIsAccessory] = useState(editingItem?.is_accessory || false);
  const [imageUrl, setImageUrl] = useState(editingItem?.image_url || '');
  const [wearingImageUrl, setWearingImageUrl] = useState(editingItem?.wearing_image_url || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [wearingImageFile, setWearingImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('clothing-images')
      .upload(path, file, { upsert: true });
    
    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('clothing-images')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, isWearing: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isWearing) {
      setWearingImageFile(file);
      setWearingImageUrl(URL.createObjectURL(file));
    } else {
      setImageFile(file);
      setImageUrl(URL.createObjectURL(file));
    }
  };

  const handleCreateCategory = async () => {
    if (!user || !newCategoryName.trim()) return;

    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: user.id, name: newCategoryName.trim() })
      .select()
      .single();

    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('success'), description: t('categoryCreated') });
      setCategoryId(data.id);
      setNewCategoryName('');
      setShowNewCategory(false);
      onCategoryCreated();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!imageUrl && !imageFile) {
      toast({ title: t('error'), description: t('required') + ': ' + t('clothingPhoto'), variant: 'destructive' });
      return;
    }

    setSubmitting(true);

    try {
      let finalImageUrl = imageUrl;
      let finalWearingUrl = wearingImageUrl;

      // Upload new images
      if (imageFile) {
        const path = `${user.id}/${Date.now()}-main.${imageFile.name.split('.').pop()}`;
        const url = await uploadImage(imageFile, path);
        if (url) finalImageUrl = url;
      }

      if (wearingImageFile) {
        const path = `${user.id}/${Date.now()}-wearing.${wearingImageFile.name.split('.').pop()}`;
        const url = await uploadImage(wearingImageFile, path);
        if (url) finalWearingUrl = url;
      }

      const itemData = {
        user_id: user.id,
        name: name.trim(),
        category_id: categoryId || null,
        size: size || null,
        size_type: sizeType,
        color: color || null,
        brand: brand || null,
        notes: notes || null,
        image_url: finalImageUrl,
        wearing_image_url: finalWearingUrl || null,
        is_accessory: isAccessory,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('clothing_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast({ title: t('success'), description: t('clothingUpdated') });
      } else {
        const { error } = await supabase.from('clothing_items').insert(itemData);
        if (error) throw error;
        toast({ title: t('success'), description: t('clothingAdded') });
      }

      onSuccess();
    } catch (error: any) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const letterSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Image Upload */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('clothingPhoto')} *</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImageSelect(e, false)}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-border bg-secondary/50 transition-colors hover:border-accent hover:bg-secondary"
          >
            {imageUrl ? (
              <>
                <img src={imageUrl} alt="Clothing" className="h-full w-full object-cover" />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageUrl('');
                    setImageFile(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <Upload className="h-8 w-8" />
                <span className="text-xs">{t('uploadPhoto')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('wearingPhoto')}</Label>
          <input
            ref={wearingFileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImageSelect(e, true)}
            className="hidden"
          />
          <div
            onClick={() => wearingFileInputRef.current?.click()}
            className="relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-border bg-secondary/50 transition-colors hover:border-accent hover:bg-secondary"
          >
            {wearingImageUrl ? (
              <>
                <img src={wearingImageUrl} alt="Wearing" className="h-full w-full object-cover" />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setWearingImageUrl('');
                    setWearingImageFile(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <Upload className="h-8 w-8" />
                <span className="text-xs">{t('optional')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">{t('clothingName')} *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder={language === 'es' ? 'Camiseta azul' : 'Blue t-shirt'}
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>{t('category')}</Label>
        {showNewCategory ? (
          <div className="flex gap-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder={language === 'es' ? 'Nueva categoría' : 'New category'}
            />
            <Button type="button" size="sm" onClick={handleCreateCategory}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewCategory(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={t('selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {language === 'es' && cat.name_es ? cat.name_es : cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" onClick={() => setShowNewCategory(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Size */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('sizeType')}</Label>
          <Select value={sizeType} onValueChange={setSizeType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="letter">{t('letterSize')}</SelectItem>
              <SelectItem value="numeric">{t('numericSize')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('size')}</Label>
          {sizeType === 'letter' ? (
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger>
                <SelectValue placeholder={t('size')} />
              </SelectTrigger>
              <SelectContent>
                {letterSizes.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="42"
            />
          )}
        </div>
      </div>

      {/* Color & Brand */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('color')}</Label>
          <Input
            type="color"
            value={color || '#000000'}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <Label>{t('brand')}</Label>
          <Input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Nike, Zara..."
          />
        </div>
      </div>

      {/* Is Accessory */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="accessory"
          checked={isAccessory}
          onCheckedChange={(checked) => setIsAccessory(checked as boolean)}
        />
        <Label htmlFor="accessory" className="cursor-pointer">{t('isAccessory')}</Label>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>{t('notes')}</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={language === 'es' ? 'Notas adicionales...' : 'Additional notes...'}
          rows={2}
        />
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