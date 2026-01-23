import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Star, LayoutGrid, AlertCircle, Wand2, ArrowUpCircle } from 'lucide-react';
import OutfitCard from '@/components/outfits/OutfitCard';
import { Skeleton } from '@/components/ui/skeleton';
import OutfitBuilder from '@/components/outfits/OutfitBuilder';
import OutfitDetailDialog from '@/components/outfits/OutfitDetailDialog';
import AIOutfitGenerator from '@/components/outfits/AIOutfitGenerator';
import AIOutfitUpgrade from '@/components/outfits/AIOutfitUpgrade';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Outfit {
  id: string;
  name: string;
  photo_url: string | null;
  is_favorite: boolean;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
}

interface OutfitWithItems extends Outfit {
  items: ClothingItem[];
  isComplete: boolean;
}

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

export default function Outfits() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [outfits, setOutfits] = useState<OutfitWithItems[]>([]);
  const [clothes, setClothes] = useState<ClothingItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<OutfitWithItems | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showAIUpgrade, setShowAIUpgrade] = useState(false);
  const [selectedOutfit, setSelectedOutfit] = useState<OutfitWithItems | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch ALL data in parallel - single batch for outfit_items (no N+1)
      const [outfitsRes, clothesRes, categoriesRes, allOutfitItemsRes] = await Promise.all([
        supabase
          .from('outfits')
          .select('id, name, photo_url, is_favorite, tags, notes, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('clothing_items')
          .select('id, name, image_url, category_id')
          .eq('user_id', user.id),
        supabase
          .from('categories')
          .select('id, name, name_es, is_top, is_bottom')
          .eq('user_id', user.id),
        supabase
          .from('outfit_items')
          .select('outfit_id, clothing_item_id'),
      ]);

      if (clothesRes.data) setClothes(clothesRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);

      if (outfitsRes.data && clothesRes.data && categoriesRes.data && allOutfitItemsRes.data) {
        // Create lookup maps for O(1) access
        const clothesMap = new Map(clothesRes.data.map(c => [c.id, c]));
        const categoriesMap = new Map(categoriesRes.data.map(c => [c.id, c]));
        
        // Group outfit items by outfit_id
        const outfitItemsMap = new Map<string, string[]>();
        for (const item of allOutfitItemsRes.data) {
          const existing = outfitItemsMap.get(item.outfit_id) || [];
          existing.push(item.clothing_item_id);
          outfitItemsMap.set(item.outfit_id, existing);
        }

        // Build outfits with items in memory (no additional queries)
        const outfitsWithItems = outfitsRes.data.map((outfit) => {
          const itemIds = outfitItemsMap.get(outfit.id) || [];
          const items = itemIds
            .map(id => clothesMap.get(id))
            .filter((c): c is ClothingItem => !!c);

          // Check completeness
          const hasTop = items.some(item => categoriesMap.get(item.category_id || '')?.is_top);
          const hasBottom = items.some(item => categoriesMap.get(item.category_id || '')?.is_bottom);

          return { ...outfit, items, isComplete: hasTop && hasBottom };
        });

        setOutfits(outfitsWithItems);
      }
    } catch (error) {
      console.error('Error fetching outfits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const toggleFavorite = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('outfits')
      .update({ is_favorite: !currentValue })
      .eq('id', id);

    if (!error) {
      setOutfits((prev) =>
        prev.map((o) => (o.id === id ? { ...o, is_favorite: !currentValue } : o))
      );
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('outfits').delete().eq('id', id);
    if (error) {
      toast({ title: t('error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('success'), description: t('outfitDeleted') });
      fetchData();
    }
  };

  const handleEdit = (outfit: OutfitWithItems) => {
    setEditingOutfit(outfit);
    setShowBuilder(true);
  };

  const handleBuilderClose = () => {
    setShowBuilder(false);
    setEditingOutfit(null);
  };

  const handleBuilderSuccess = () => {
    handleBuilderClose();
    fetchData();
  };

  const handleAIGeneratorSuccess = () => {
    setShowAIGenerator(false);
    fetchData();
  };

  const handleViewOutfit = (outfit: OutfitWithItems) => {
    setSelectedOutfit(outfit);
    setShowDetail(true);
  };

  const handleDetailClose = () => {
    setShowDetail(false);
    setSelectedOutfit(null);
  };

  const filteredOutfits = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return outfits.filter((outfit) => {
      const matchesSearch = outfit.name.toLowerCase().includes(query);
      const matchesTab = 
        activeTab === 'all' || 
        (activeTab === 'favorites' && outfit.is_favorite) ||
        (activeTab === 'incomplete' && !outfit.isComplete);
      return matchesSearch && matchesTab;
    });
  }, [outfits, searchQuery, activeTab]);

  const incompleteCount = useMemo(() => outfits.filter((o) => !o.isComplete).length, [outfits]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold">{t('myOutfits')}</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-0.5 sm:mt-1">
            {outfits.length} outfits
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowBuilder(true)} className="gap-2" size="sm">
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">{t('createOutfit')}</span>
            <span className="xs:hidden">New</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowAIGenerator(true)} 
            className="gap-2"
            size="sm"
          >
            <Wand2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('createWithAI')}</span>
            <span className="sm:hidden">AI</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowAIUpgrade(true)} 
            className="gap-2"
            size="sm"
          >
            <ArrowUpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{t('upgradeWithAI')}</span>
            <span className="sm:hidden">Upgrade</span>
          </Button>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 sm:h-10"
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto overflow-x-auto">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
              <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{t('allOutfits')}</span>
              <span className="xs:hidden">All</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{t('favorites')}</span>
              <span className="xs:hidden">Fav</span>
            </TabsTrigger>
            {incompleteCount > 0 && (
              <TabsTrigger value="incomplete" className="gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('outfitToMake')}</span> ({incompleteCount})
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredOutfits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
          <div className="mb-4 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-secondary">
            <LayoutGrid className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-lg sm:text-xl font-medium">{t('noOutfits')}</h3>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t('buildFirstOutfit')}</p>
          <Button onClick={() => setShowBuilder(true)} className="mt-4 gap-2" size="sm">
            <Plus className="h-4 w-4" />
            {t('createOutfit')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredOutfits.map((outfit) => (
            <div key={outfit.id} onClick={() => handleViewOutfit(outfit)} className="cursor-pointer">
              <OutfitCard
                outfit={outfit}
                onToggleFavorite={() => toggleFavorite(outfit.id, outfit.is_favorite)}
                onEdit={() => handleEdit(outfit)}
                onDelete={() => handleDelete(outfit.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Outfit Detail Dialog */}
      <OutfitDetailDialog
        outfit={selectedOutfit}
        categories={categories}
        open={showDetail}
        onOpenChange={handleDetailClose}
        onEdit={() => {
          handleDetailClose();
          if (selectedOutfit) handleEdit(selectedOutfit);
        }}
        onDelete={() => {
          handleDetailClose();
          if (selectedOutfit) handleDelete(selectedOutfit.id);
        }}
        onToggleFavorite={() => {
          if (selectedOutfit) {
            toggleFavorite(selectedOutfit.id, selectedOutfit.is_favorite);
            setSelectedOutfit({ ...selectedOutfit, is_favorite: !selectedOutfit.is_favorite });
          }
        }}
      />

      {/* Builder Dialog */}
      <Dialog open={showBuilder} onOpenChange={handleBuilderClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingOutfit ? t('edit') : t('createOutfit')}
            </DialogTitle>
          </DialogHeader>
          <OutfitBuilder
            clothes={clothes}
            categories={categories}
            editingOutfit={editingOutfit}
            onSuccess={handleBuilderSuccess}
            onCancel={handleBuilderClose}
          />
        </DialogContent>
      </Dialog>

      {/* AI Generator Dialog */}
      <Dialog open={showAIGenerator} onOpenChange={setShowAIGenerator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              {t('createWithAI')}
            </DialogTitle>
            <DialogDescription>
              {language === 'es' 
                ? 'La IA creará un outfit basado en tu armario y preferencias de estilo'
                : 'AI will create an outfit based on your wardrobe and style preferences'}
            </DialogDescription>
          </DialogHeader>
          <AIOutfitGenerator
            onSuccess={handleAIGeneratorSuccess}
            onCancel={() => setShowAIGenerator(false)}
          />
        </DialogContent>
      </Dialog>

      {/* AI Upgrade Dialog */}
      <Dialog open={showAIUpgrade} onOpenChange={setShowAIUpgrade}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5" />
              {t('upgradeWithAI')}
            </DialogTitle>
            <DialogDescription>
              {language === 'es' 
                ? 'La IA analizará tu outfit y sugerirá mejoras'
                : 'AI will analyze your outfit and suggest improvements'}
            </DialogDescription>
          </DialogHeader>
          <AIOutfitUpgrade
            outfits={outfits.map(o => ({ id: o.id, name: o.name }))}
            onSuccess={() => { setShowAIUpgrade(false); fetchData(); }}
            onCancel={() => setShowAIUpgrade(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
