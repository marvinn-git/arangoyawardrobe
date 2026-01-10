import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shirt, LayoutGrid, Users, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublicClothing {
  id: string;
  name: string;
  image_url: string;
  wearing_image_url: string | null;
  brand: string | null;
  user_name?: string;
}

interface PublicOutfit {
  id: string;
  name: string;
  photo_url: string | null;
  tags: string[] | null;
  user_name?: string;
  items: { id: string; name: string; image_url: string }[];
}

export default function Inspiration() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'outfits' | 'wearing' | 'clothes'>('outfits');
  const [loading, setLoading] = useState(true);
  const [outfits, setOutfits] = useState<PublicOutfit[]>([]);
  const [clothes, setClothes] = useState<PublicClothing[]>([]);
  const [wearingPhotos, setWearingPhotos] = useState<PublicClothing[]>([]);

  useEffect(() => {
    fetchPublicContent();
  }, []);

  const fetchPublicContent = async () => {
    setLoading(true);
    try {
      // Fetch public outfits - simplified query
      const outfitsRes = await supabase
        .from('outfits')
        .select('id, name, photo_url, tags, user_id')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (outfitsRes.data) {
        const outfitsWithItems: PublicOutfit[] = [];
        for (const outfit of outfitsRes.data) {
          const { data: itemsData } = await supabase
            .from('outfit_items')
            .select('clothing_item_id')
            .eq('outfit_id', outfit.id);

          const itemIds = itemsData?.map((i) => i.clothing_item_id) || [];
          
          let items: { id: string; name: string; image_url: string }[] = [];
          if (itemIds.length > 0) {
            const { data: clothingData } = await supabase
              .from('clothing_items')
              .select('id, name, image_url')
              .in('id', itemIds);
            items = clothingData || [];
          }

          outfitsWithItems.push({
            id: outfit.id,
            name: outfit.name,
            photo_url: outfit.photo_url,
            tags: outfit.tags,
            user_name: 'Community',
            items,
          });
        }
        setOutfits(outfitsWithItems);
      }

      // Fetch public clothing items - simplified query
      const clothingRes = await supabase
        .from('clothing_items')
        .select('id, name, image_url, wearing_image_url, brand, user_id')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (clothingRes.data) {
        const allClothes: PublicClothing[] = clothingRes.data.map((item) => ({
          id: item.id,
          name: item.name,
          image_url: item.image_url,
          wearing_image_url: item.wearing_image_url,
          brand: item.brand,
          user_name: 'Community',
        }));

        setClothes(allClothes);
        setWearingPhotos(allClothes.filter((item) => item.wearing_image_url));
      }
    } catch (error) {
      console.error('Error fetching public content:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-accent" />
          <h1 className="font-display text-3xl font-semibold">
            {language === 'es' ? 'Inspiración' : 'Inspiration'}
          </h1>
        </div>
        <p className="text-muted-foreground max-w-md mx-auto">
          {language === 'es' 
            ? 'Descubre outfits y estilos de la comunidad'
            : 'Discover outfits and styles from the community'}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="w-full max-w-md mx-auto grid grid-cols-3">
          <TabsTrigger value="outfits" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === 'es' ? 'Outfits' : 'Outfits'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="wearing" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === 'es' ? 'Looks' : 'Looks'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="clothes" className="gap-2">
            <Shirt className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === 'es' ? 'Prendas' : 'Pieces'}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Outfits Tab */}
          {activeTab === 'outfits' && (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {outfits.length === 0 ? (
                <EmptyState 
                  icon={LayoutGrid}
                  message={language === 'es' 
                    ? 'Aún no hay outfits públicos' 
                    : 'No public outfits yet'}
                />
              ) : (
                outfits.map((outfit) => (
                  <div 
                    key={outfit.id}
                    className="break-inside-avoid mb-4 rounded-xl overflow-hidden bg-card border shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Outfit preview - show first 4 items in grid */}
                    <div className="grid grid-cols-2 gap-0.5 bg-muted">
                      {outfit.items.slice(0, 4).map((item, idx) => (
                        <div 
                          key={item.id}
                          className={cn(
                            "aspect-square bg-secondary overflow-hidden",
                            outfit.items.length === 1 && "col-span-2 row-span-2"
                          )}
                        >
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm truncate">{outfit.name}</h3>
                      <p className="text-xs text-muted-foreground">by {outfit.user_name}</p>
                      {outfit.tags && outfit.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {outfit.tags.slice(0, 2).map((tag) => (
                            <span 
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-secondary rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Wearing Photos Tab */}
          {activeTab === 'wearing' && (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {wearingPhotos.length === 0 ? (
                <EmptyState 
                  icon={Users}
                  message={language === 'es' 
                    ? 'Aún no hay fotos de looks' 
                    : 'No look photos yet'}
                />
              ) : (
                wearingPhotos.map((item) => (
                  <div 
                    key={item.id}
                    className="break-inside-avoid mb-4 rounded-xl overflow-hidden bg-card border shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-[3/4] bg-secondary overflow-hidden">
                      <img
                        src={item.wearing_image_url!}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm truncate">{item.name}</h3>
                      {item.brand && (
                        <p className="text-xs text-muted-foreground">{item.brand}</p>
                      )}
                      <p className="text-xs text-muted-foreground">by {item.user_name}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Clothes Tab */}
          {activeTab === 'clothes' && (
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
              {clothes.length === 0 ? (
                <EmptyState 
                  icon={Shirt}
                  message={language === 'es' 
                    ? 'Aún no hay prendas públicas' 
                    : 'No public pieces yet'}
                />
              ) : (
                clothes.map((item) => (
                  <div 
                    key={item.id}
                    className="break-inside-avoid mb-4 rounded-xl overflow-hidden bg-card border shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square bg-secondary overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm truncate">{item.name}</h3>
                      {item.brand && (
                        <p className="text-xs text-muted-foreground">{item.brand}</p>
                      )}
                      <p className="text-xs text-muted-foreground">by {item.user_name}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
