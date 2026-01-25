import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Camera, LayoutGrid, Shirt, Upload, Check } from 'lucide-react';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Outfit {
  id: string;
  name: string;
  photo_url: string | null;
  is_public: boolean;
}

interface ClothingItem {
  id: string;
  name: string;
  image_url: string;
  is_public: boolean;
}

type PostType = 'fit_check' | 'outfit' | 'clothing_item';

export default function CreatePostDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePostDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [postType, setPostType] = useState<PostType>('outfit');
  const [caption, setCaption] = useState('');
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const [selectedClothingId, setSelectedClothingId] = useState<string | null>(null);
  const [fitCheckImage, setFitCheckImage] = useState<File | null>(null);
  const [fitCheckPreview, setFitCheckPreview] = useState<string | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [clothingItems, setClothingItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchUserContent();
    }
  }, [open, user]);

  const fetchUserContent = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const [outfitsRes, clothingRes] = await Promise.all([
        supabase
          .from('outfits')
          .select('id, name, photo_url, is_public')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('clothing_items')
          .select('id, name, image_url, is_public')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (outfitsRes.data) setOutfits(outfitsRes.data);
      if (clothingRes.data) setClothingItems(clothingRes.data);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFitCheckImage(file);
      setFitCheckPreview(URL.createObjectURL(file));
    }
  };

  const handlePost = async () => {
    if (!user) return;

    // Validation
    if (postType === 'outfit' && !selectedOutfitId) {
      toast({
        title: language === 'es' ? 'Error' : 'Error',
        description: language === 'es' ? 'Selecciona un outfit' : 'Select an outfit',
        variant: 'destructive',
      });
      return;
    }

    if (postType === 'clothing_item' && !selectedClothingId) {
      toast({
        title: language === 'es' ? 'Error' : 'Error',
        description: language === 'es' ? 'Selecciona una prenda' : 'Select an item',
        variant: 'destructive',
      });
      return;
    }

    if (postType === 'fit_check' && !fitCheckImage) {
      toast({
        title: language === 'es' ? 'Error' : 'Error',
        description: language === 'es' ? 'Sube una foto' : 'Upload a photo',
        variant: 'destructive',
      });
      return;
    }

    setPosting(true);

    try {
      let imageUrl: string | null = null;

      // Upload fit check image if needed
      if (postType === 'fit_check' && fitCheckImage) {
        const fileExt = fitCheckImage.name.split('.').pop();
        const filePath = `${user.id}/fit-checks/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('clothing-images')
          .upload(filePath, fitCheckImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = await supabase.storage
          .from('clothing-images')
          .createSignedUrl(filePath, 60 * 60 * 24 * 30); // 30 days expiration

        imageUrl = urlData?.signedUrl || null;
      }

      // Make outfit/clothing public if selected
      if (postType === 'outfit' && selectedOutfitId) {
        await supabase
          .from('outfits')
          .update({ is_public: true })
          .eq('id', selectedOutfitId);

        // Also make the clothing items in this outfit public so they display in the feed
        const { data: outfitItemsData } = await supabase
          .from('outfit_items')
          .select('clothing_item_id')
          .eq('outfit_id', selectedOutfitId);

        if (outfitItemsData && outfitItemsData.length > 0) {
          const itemIds = outfitItemsData.map(oi => oi.clothing_item_id);
          await supabase
            .from('clothing_items')
            .update({ is_public: true })
            .in('id', itemIds);
        }
      }

      if (postType === 'clothing_item' && selectedClothingId) {
        await supabase
          .from('clothing_items')
          .update({ is_public: true })
          .eq('id', selectedClothingId);
      }

      // Create post
      const { error: postError } = await supabase
        .from('inspiration_posts')
        .insert({
          user_id: user.id,
          post_type: postType,
          caption: caption.trim() || null,
          outfit_id: postType === 'outfit' ? selectedOutfitId : null,
          clothing_item_id: postType === 'clothing_item' ? selectedClothingId : null,
          image_url: imageUrl,
        });

      if (postError) throw postError;

      // Reset form
      setCaption('');
      setSelectedOutfitId(null);
      setSelectedClothingId(null);
      setFitCheckImage(null);
      setFitCheckPreview(null);
      setPostType('outfit');

      onSuccess();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: language === 'es' ? 'Error' : 'Error',
        description: language === 'es' ? 'No se pudo crear la publicación' : 'Failed to create post',
        variant: 'destructive',
      });
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {language === 'es' ? 'Nueva publicación' : 'New Post'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Post type selector */}
          <div className="space-y-3">
            <Label>{language === 'es' ? 'Tipo de publicación' : 'Post type'}</Label>
            <RadioGroup
              value={postType}
              onValueChange={(v) => setPostType(v as PostType)}
              className="grid grid-cols-3 gap-2"
            >
              <Label
                htmlFor="type-outfit"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  postType === 'outfit' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                }`}
              >
                <RadioGroupItem value="outfit" id="type-outfit" className="sr-only" />
                <LayoutGrid className="h-6 w-6" />
                <span className="text-sm font-medium">Outfit</span>
              </Label>
              
              <Label
                htmlFor="type-clothing"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  postType === 'clothing_item' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                }`}
              >
                <RadioGroupItem value="clothing_item" id="type-clothing" className="sr-only" />
                <Shirt className="h-6 w-6" />
                <span className="text-sm font-medium">{language === 'es' ? 'Prenda' : 'Item'}</span>
              </Label>
              
              <Label
                htmlFor="type-fitcheck"
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  postType === 'fit_check' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                }`}
              >
                <RadioGroupItem value="fit_check" id="type-fitcheck" className="sr-only" />
                <Camera className="h-6 w-6" />
                <span className="text-sm font-medium">Fit Check</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Content selector based on type */}
          {postType === 'outfit' && (
            <div className="space-y-3">
              <Label>{language === 'es' ? 'Selecciona un outfit' : 'Select an outfit'}</Label>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : outfits.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {language === 'es' ? 'No tienes outfits' : 'No outfits available'}
                </p>
              ) : (
                <ScrollArea className="h-48">
                  <div className="grid grid-cols-3 gap-2">
                    {outfits.map((outfit) => (
                      <Card
                        key={outfit.id}
                        onClick={() => setSelectedOutfitId(outfit.id)}
                        className={`relative aspect-square cursor-pointer overflow-hidden transition-all ${
                          selectedOutfitId === outfit.id 
                            ? 'ring-2 ring-primary' 
                            : 'hover:ring-2 hover:ring-muted-foreground'
                        }`}
                      >
                        {outfit.photo_url ? (
                          <img
                            src={outfit.photo_url}
                            alt={outfit.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-secondary flex items-center justify-center">
                            <LayoutGrid className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        {selectedOutfitId === outfit.id && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {postType === 'clothing_item' && (
            <div className="space-y-3">
              <Label>{language === 'es' ? 'Selecciona una prenda' : 'Select an item'}</Label>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : clothingItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {language === 'es' ? 'No tienes prendas' : 'No items available'}
                </p>
              ) : (
                <ScrollArea className="h-48">
                  <div className="grid grid-cols-3 gap-2">
                    {clothingItems.map((item) => (
                      <Card
                        key={item.id}
                        onClick={() => setSelectedClothingId(item.id)}
                        className={`relative aspect-square cursor-pointer overflow-hidden transition-all ${
                          selectedClothingId === item.id 
                            ? 'ring-2 ring-primary' 
                            : 'hover:ring-2 hover:ring-muted-foreground'
                        }`}
                      >
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                        {selectedClothingId === item.id && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {postType === 'fit_check' && (
            <div className="space-y-3">
              <Label>{language === 'es' ? 'Sube tu foto' : 'Upload your photo'}</Label>
              <div className="relative">
                {fitCheckPreview ? (
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-secondary">
                    <img
                      src={fitCheckPreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute bottom-2 right-2"
                      onClick={() => {
                        setFitCheckImage(null);
                        setFitCheckPreview(null);
                      }}
                    >
                      {language === 'es' ? 'Cambiar' : 'Change'}
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-[3/4] rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 cursor-pointer transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      {language === 'es' ? 'Haz clic para subir' : 'Click to upload'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">
              {language === 'es' ? 'Descripción (opcional)' : 'Caption (optional)'}
            </Label>
            <Textarea
              id="caption"
              placeholder={language === 'es' ? 'Escribe algo sobre tu look...' : 'Write something about your look...'}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button onClick={handlePost} disabled={posting} className="flex-1">
            {posting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {language === 'es' ? 'Publicando...' : 'Posting...'}
              </>
            ) : (
              language === 'es' ? 'Publicar' : 'Post'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}