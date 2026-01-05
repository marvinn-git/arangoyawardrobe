import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableChipSelector } from '@/components/ui/searchable-chip-selector';
import { Combobox } from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Loader2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  name_es: string | null;
  is_top?: boolean;
  is_bottom?: boolean;
}

interface Brand {
  id: string;
  name: string;
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
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    editingItem?.category_id ? [editingItem.category_id] : []
  );
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
  const [brands, setBrands] = useState<Brand[]>([]);

  // Fetch brands on mount
  useEffect(() => {
    const fetchBrands = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('brands')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      if (data) setBrands(data);
    };
    fetchBrands();
  }, [user]);

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

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      }
      // Only allow one category for now
      return [categoryId];
    });
  };

  const handleCreateCategory = async (categoryName: string) => {
    if (!user || !categoryName.trim()) return;

    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: user.id, name: categoryName.trim() })
      .select()
      .single();

    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('success'), description: t('categoryCreated') });
      setSelectedCategoryIds([data.id]);
      onCategoryCreated();
    }
  };

  const handleCreateBrand = async (brandName: string) => {
    if (!user || !brandName.trim()) return;

    const { data, error } = await supabase
      .from('brands')
      .insert({ user_id: user.id, name: brandName.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Already exists, just select it
        setBrand(brandName.trim());
      } else {
        toast({ title: t('error'), description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: t('success'), description: t('brandCreated') });
      setBrands([...brands, data]);
      setBrand(brandName.trim());
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
        category_id: selectedCategoryIds[0] || null,
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

  const brandOptions = brands.map((b) => ({
    value: b.name,
    label: b.name,
  }));

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

      {/* Category - Searchable Chip Selector */}
      <div className="space-y-2">
        <Label>{t('category')}</Label>
        <SearchableChipSelector
          options={categories}
          selectedIds={selectedCategoryIds}
          onToggle={handleToggleCategory}
          onCreateNew={handleCreateCategory}
          maxSelected={1}
          placeholder={t('selectCategory')}
          showCreateNew={true}
        />
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
          <Combobox
            options={brandOptions}
            value={brand}
            onChange={setBrand}
            onCreateNew={handleCreateBrand}
            placeholder={t('selectBrand')}
            searchPlaceholder={t('typeToSearch')}
            emptyText={t('noResults')}
            createNewText={t('createNew')}
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
