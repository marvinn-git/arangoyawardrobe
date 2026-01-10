import { useState, useEffect } from 'react';
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

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-test-clothing`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await resp.json();

      if (!resp.ok) {
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
        description: error?.message || 'Failed to seed clothing',
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
      const [clothesRes, categoriesRes] = await Promise.all([
        supabase
          .from('clothing_items')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .eq('user_id', user.id)
          .order('name'),
      ]);

      if (clothesRes.data) setClothes(clothesRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const filteredClothes = clothes.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.color?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesTab = activeTab === 'all' || (activeTab === 'favorites' && item.is_favorite);
    return matchesSearch && matchesCategory && matchesTab;
  });

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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">{t('myWardrobe')}</h1>
          <p className="text-muted-foreground mt-1">
            {clothes.length} {language === 'es' ? 'prendas' : 'items'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('addClothing')}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSeedTestClothing} 
            disabled={seedingClothes}
            className="gap-2"
          >
            {seedingClothes ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            {language === 'es' ? 'Añadir ropa de prueba' : 'Add test clothing'}
          </Button>
        </div>
      </div>

      {/* Search, Filter, and Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
            language={language}
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Shirt className="h-4 w-4" />
              {t('allItems')}
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              <Star className="h-4 w-4" />
              {t('favorites')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">{t('loading')}</div>
        </div>
      ) : filteredClothes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Shirt className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-xl font-medium">{t('noClothes')}</h3>
          <p className="text-muted-foreground mt-1">{t('addFirstItem')}</p>
          <Button onClick={() => setShowForm(true)} className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            {t('addClothing')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredClothes.map((item) => (
            <ClothingCard
              key={item.id}
              item={item}
              category={categories.find((c) => c.id === item.category_id)}
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
