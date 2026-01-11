import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Star, LayoutGrid, AlertCircle, Wand2, ArrowUpCircle } from 'lucide-react';
import OutfitCard from '@/components/outfits/OutfitCard';
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
      // Fetch outfits, clothes, and categories
      const [outfitsRes, clothesRes, categoriesRes] = await Promise.all([
        supabase
          .from('outfits')
          .select('*')
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
      ]);

      if (clothesRes.data) setClothes(clothesRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);

      if (outfitsRes.data && clothesRes.data && categoriesRes.data) {
        // Fetch outfit items for each outfit
        const outfitsWithItems = await Promise.all(
          outfitsRes.data.map(async (outfit) => {
            const { data: itemsData } = await supabase
              .from('outfit_items')
              .select('clothing_item_id')
              .eq('outfit_id', outfit.id);

            const itemIds = itemsData?.map((i) => i.clothing_item_id) || [];
            const items = clothesRes.data?.filter((c) => itemIds.includes(c.id)) || [];

            // Check if outfit is complete (has top and bottom)
            const hasTop = items.some((item) => {
              const cat = categoriesRes.data?.find((c) => c.id === item.category_id);
              return cat?.is_top;
            });
            const hasBottom = items.some((item) => {
              const cat = categoriesRes.data?.find((c) => c.id === item.category_id);
              return cat?.is_bottom;
            });

            return { ...outfit, items, isComplete: hasTop && hasBottom };
          })
        );

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

  const filteredOutfits = outfits.filter((outfit) => {
    const matchesSearch = outfit.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'favorites' && outfit.is_favorite) ||
      (activeTab === 'incomplete' && !outfit.isComplete);
    return matchesSearch && matchesTab;
  });

  const incompleteCount = outfits.filter((o) => !o.isComplete).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">{t('myOutfits')}</h1>
          <p className="text-muted-foreground mt-1">
            {outfits.length} outfits
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowBuilder(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('createOutfit')}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowAIGenerator(true)} 
            className="gap-2"
          >
            <Wand2 className="h-4 w-4" />
            {t('createWithAI')}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowAIUpgrade(true)} 
            className="gap-2"
          >
            <ArrowUpCircle className="h-4 w-4" />
            {t('upgradeWithAI')}
          </Button>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              {t('allOutfits')}
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              <Star className="h-4 w-4" />
              {t('favorites')}
            </TabsTrigger>
            {incompleteCount > 0 && (
              <TabsTrigger value="incomplete" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                {t('outfitToMake')} ({incompleteCount})
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-muted-foreground">{t('loading')}</div>
        </div>
      ) : filteredOutfits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <LayoutGrid className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-xl font-medium">{t('noOutfits')}</h3>
          <p className="text-muted-foreground mt-1">{t('buildFirstOutfit')}</p>
          <Button onClick={() => setShowBuilder(true)} className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            {t('createOutfit')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
