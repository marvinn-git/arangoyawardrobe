import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Shirt, Star, Database, Loader2 } from 'lucide-react';
import ClothingCard from '@/components/wardrobe/ClothingCard';
import ClothingForm from '@/components/wardrobe/ClothingForm';
import CategoryFilter from '@/components/wardrobe/CategoryFilter';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  is_favorite: boolean;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  name_es: string | null;
  is_top: boolean;
  is_bottom: boolean;
}

export default function Wardrobe() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  
  const [clothes, setClothes] = useState<ClothingItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ClothingItem | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [seedingClothes, setSeedingClothes] = useState(false);

  const handleSeedTestClothing = async () => {
    if (!user) return;
    
    setSeedingClothes(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-test-clothing`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to seed clothing');
      }

      toast({
        title: language === 'es' ? 'Ropa de prueba añadida' : 'Test clothing added',
        description: data.message,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSeedingClothes(false);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch only needed fields for better performance
      const [clothesRes, categoriesRes] = await Promise.all([
        supabase
          .from('clothing_items')
          .select('id, name, category_id, size, size_type, color, brand, notes, image_url, wearing_image_url, is_accessory, is_favorite, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('id, name, name_es, is_top, is_bottom')
          .eq('user_id', user.id)
          .order('name'),
      ]);

      if (clothesRes.data) setClothes(clothesRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const filteredClothes = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return clothes.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(query) ||
        item.brand?.toLowerCase().includes(query) ||
        item.color?.toLowerCase().includes(query);
      const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
      const matchesTab = activeTab === 'all' || (activeTab === 'favorites' && item.is_favorite);
      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [clothes, searchQuery, selectedCategory, activeTab]);

  // Memoize category lookup map for O(1) access in render
  const categoryMap = useMemo(() => 
    new Map(categories.map(c => [c.id, c])), 
    [categories]
  );

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('clothing_items').delete().eq('id', id);
    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('success'), description: t('clothingDeleted') });
      fetchData();
    }
  };

  const handleToggleFavorite = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('clothing_items')
      .update({ is_favorite: !currentValue })
      .eq('id', id);

    if (!error) {
      setClothes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_favorite: !currentValue } : c))
      );
    }
  };

  const handleEdit = (item: ClothingItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    fetchData();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">{t('myWardrobe')}</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-0.5 sm:mt-1">
            {clothes.length} {language === 'es' ? 'prendas' : 'items'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowForm(true)} className="gap-2" size="sm">
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">{t('addClothing')}</span>
            <span className="xs:hidden">Add</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSeedTestClothing} 
            disabled={seedingClothes}
            className="gap-2"
            size="sm"
          >
            {seedingClothes ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{language === 'es' ? 'Añadir ropa de prueba' : 'Add test clothing'}</span>
            <span className="sm:hidden">Test</span>
          </Button>
        </div>
      </div>

      {/* Search, Filter, and Tabs */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 sm:h-10"
            />
          </div>
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
            language={language}
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="overflow-x-auto">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
              <Shirt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{t('allItems')}</span>
              <span className="xs:hidden">All</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{t('favorites')}</span>
              <span className="xs:hidden">Fav</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredClothes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
          <div className="mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-secondary">
            <Shirt className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-lg sm:text-xl font-medium">{t('noClothes')}</h3>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t('addFirstItem')}</p>
          <Button onClick={() => setShowForm(true)} className="mt-4 gap-2" size="sm">
            <Plus className="h-4 w-4" />
            {t('addClothing')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredClothes.map((item) => (
            <ClothingCard
              key={item.id}
              item={item}
              category={categoryMap.get(item.category_id || '')}
              language={language}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item.id)}
              onToggleFavorite={() => handleToggleFavorite(item.id, item.is_favorite)}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={handleFormClose}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingItem ? t('edit') : t('addClothing')}
            </DialogTitle>
          </DialogHeader>
          <ClothingForm
            categories={categories}
            editingItem={editingItem}
            onSuccess={handleFormSuccess}
            onCancel={handleFormClose}
            onCategoryCreated={fetchData}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
