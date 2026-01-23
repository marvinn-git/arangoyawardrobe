import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Heart, Share2, Shirt, LayoutGrid, Camera, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

interface Profile {
  username: string | null;
  avatar_url: string | null;
}

interface InspirationPost {
  id: string;
  user_id: string;
  outfit_id: string | null;
  clothing_item_id: string | null;
  image_url: string | null;
  caption: string | null;
  post_type: 'fit_check' | 'outfit' | 'clothing_item';
  likes_count: number;
  created_at: string;
  profile?: Profile;
  hasLiked?: boolean;
  hasSaved?: boolean;
  outfit?: {
    id: string;
    name: string;
    photo_url: string | null;
    items: { id: string; name: string; image_url: string }[];
  };
  clothing_item?: {
    id: string;
    name: string;
    image_url: string;
  };
}

interface InspirationPostCardProps {
  post: InspirationPost;
  onLike: () => void;
  onSave: () => void;
  currentUserId?: string;
}

export default function InspirationPostCard({
  post,
  onLike,
  onSave,
  currentUserId,
}: InspirationPostCardProps) {
  const { language } = useLanguage();
  const [showDetail, setShowDetail] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  const getPostImage = () => {
    if (post.image_url) return post.image_url;
    if (post.outfit?.photo_url) return post.outfit.photo_url;
    if (post.clothing_item?.image_url) return post.clothing_item.image_url;
    return null;
  };

  const getPostTypeIcon = () => {
    switch (post.post_type) {
      case 'fit_check':
        return <Camera className="h-3 w-3" />;
      case 'outfit':
        return <LayoutGrid className="h-3 w-3" />;
      case 'clothing_item':
        return <Shirt className="h-3 w-3" />;
    }
  };

  const getPostTypeLabel = () => {
    switch (post.post_type) {
      case 'fit_check':
        return language === 'es' ? 'Fit Check' : 'Fit Check';
      case 'outfit':
        return language === 'es' ? 'Outfit' : 'Outfit';
      case 'clothing_item':
        return language === 'es' ? 'Prenda' : 'Item';
    }
  };

  const imageUrl = getPostImage();
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: language === 'es' ? es : enUS,
  });

  const outfitItems = post.outfit?.items || [];
  const hasMultipleItems = outfitItems.length > 0;

  // For grid display, show up to 4 items
  const gridItems = outfitItems.slice(0, 4);
  const remainingCount = outfitItems.length - 4;

  const handlePrevItem = () => {
    setCurrentItemIndex((prev) => (prev > 0 ? prev - 1 : outfitItems.length - 1));
  };

  const handleNextItem = () => {
    setCurrentItemIndex((prev) => (prev < outfitItems.length - 1 ? prev + 1 : 0));
  };

  return (
    <>
      <Card 
        className="group overflow-hidden card-elevated cursor-pointer transition-transform duration-200 active:scale-[0.98]"
        onClick={() => setShowDetail(true)}
      >
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
          {/* If there's a direct image URL, show it */}
          {imageUrl && !hasMultipleItems ? (
            <img
              src={imageUrl}
              alt={post.caption || 'Inspiration post'}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : hasMultipleItems ? (
            // Show 2x2 grid for outfits
            <div className="grid h-full w-full grid-cols-2 gap-0.5 p-0.5">
              {gridItems.map((item, index) => (
                <div key={item.id} className="relative overflow-hidden bg-background">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Show remaining count on last tile if more than 4 items */}
                  {index === 3 && remainingCount > 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-base sm:text-lg font-bold">+{remainingCount}</span>
                    </div>
                  )}
                </div>
              ))}
              {/* Fill empty grid spots if less than 4 items */}
              {gridItems.length < 4 && Array.from({ length: 4 - gridItems.length }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-secondary/50" />
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Shirt className="h-10 w-10 sm:h-12 sm:w-12" />
            </div>
          )}

          {/* Post type badge */}
          <Badge className="absolute left-1.5 top-1.5 sm:left-2 sm:top-2 gap-1 text-[10px] sm:text-xs px-1.5 sm:px-2" variant="secondary">
            {getPostTypeIcon()}
            <span className="hidden xs:inline">{getPostTypeLabel()}</span>
          </Badge>

          {/* Item count badge for outfits */}
          {hasMultipleItems && (
            <Badge className="absolute right-1.5 bottom-1.5 sm:right-2 sm:bottom-2 text-[10px] sm:text-xs px-1.5 sm:px-2" variant="secondary">
              {outfitItems.length} {language === 'es' ? 'prendas' : 'items'}
            </Badge>
          )}

          {/* Action buttons overlay */}
          <div className="absolute right-1.5 top-1.5 sm:right-2 sm:top-2 flex flex-col gap-1">
            <Button
              variant="secondary"
              size="icon"
              className={`h-7 w-7 sm:h-9 sm:w-9 transition-all ${
                post.hasLiked ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onLike();
              }}
            >
              <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${post.hasLiked ? 'fill-current' : ''}`} />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className={`h-7 w-7 sm:h-9 sm:w-9 transition-all ${
                post.hasSaved ? 'bg-primary/20 text-primary hover:bg-primary/30' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
            >
              <Bookmark className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${post.hasSaved ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-2.5 sm:p-4 space-y-2 sm:space-y-3">
          {/* User info */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
              <AvatarImage src={post.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px] sm:text-xs">
                {post.profile?.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium truncate">
                @{post.profile?.username || 'anonymous'}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>

          {/* Caption */}
          {post.caption && (
            <p className="text-xs sm:text-sm line-clamp-2">{post.caption}</p>
          )}

          {/* Item/outfit name */}
          {(post.outfit?.name || post.clothing_item?.name) && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              {post.outfit?.name || post.clothing_item?.name}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 sm:gap-4 pt-0.5 sm:pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike();
              }}
              className={`flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm transition-colors ${
                post.hasLiked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${post.hasLiked ? 'fill-current' : ''}`} />
              {post.likes_count}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              className={`flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm transition-colors ${
                post.hasSaved ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${post.hasSaved ? 'fill-current' : ''}`} />
              <span className="hidden xs:inline">{language === 'es' ? 'Guardar' : 'Save'}</span>
            </button>
            <button 
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground"
            >
              <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {post.profile?.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-base">
                  @{post.profile?.username || 'anonymous'}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">{timeAgo}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {/* Main Image or Item Carousel */}
            {hasMultipleItems ? (
              <div className="relative">
                <div className="aspect-square bg-secondary">
                  <img
                    src={outfitItems[currentItemIndex]?.image_url}
                    alt={outfitItems[currentItemIndex]?.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                
                {/* Navigation arrows */}
                {outfitItems.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={handlePrevItem}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={handleNextItem}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Item indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 rounded-full px-3 py-1">
                  <span className="text-white text-sm">
                    {currentItemIndex + 1} / {outfitItems.length}
                  </span>
                </div>

                {/* Current item name */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-black/60 rounded-lg px-3 py-1.5 max-w-[80%]">
                  <p className="text-white text-sm truncate">
                    {outfitItems[currentItemIndex]?.name}
                  </p>
                </div>
              </div>
            ) : imageUrl ? (
              <div className="aspect-square bg-secondary">
                <img
                  src={imageUrl}
                  alt={post.caption || 'Post'}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-square bg-secondary flex items-center justify-center">
                <Shirt className="h-16 w-16 text-muted-foreground" />
              </div>
            )}

            {/* Horizontal scrollable thumbnails for outfits */}
            {hasMultipleItems && (
              <div className="p-3 sm:p-4 border-t">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {outfitItems.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentItemIndex(index)}
                      className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentItemIndex 
                          ? 'border-primary ring-2 ring-primary/30' 
                          : 'border-transparent hover:border-muted-foreground/30'
                      }`}
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Caption & Info */}
            <div className="p-4 space-y-3">
              {post.caption && (
                <p className="text-sm">{post.caption}</p>
              )}
              
              {post.outfit?.name && (
                <p className="text-sm font-medium">{post.outfit.name}</p>
              )}
              
              {post.clothing_item?.name && (
                <p className="text-sm font-medium">{post.clothing_item.name}</p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={onLike}
                  className={`flex items-center gap-2 text-sm transition-colors ${
                    post.hasLiked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${post.hasLiked ? 'fill-current' : ''}`} />
                  {post.likes_count} {language === 'es' ? 'me gusta' : 'likes'}
                </button>
                <button
                  onClick={onSave}
                  className={`flex items-center gap-2 text-sm transition-colors ${
                    post.hasSaved ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Bookmark className={`h-5 w-5 ${post.hasSaved ? 'fill-current' : ''}`} />
                  {language === 'es' ? 'Guardar' : 'Save'}
                </button>
                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <Share2 className="h-5 w-5" />
                  {language === 'es' ? 'Compartir' : 'Share'}
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
