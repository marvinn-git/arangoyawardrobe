import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, Shirt, LayoutGrid, Camera } from 'lucide-react';
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
  currentUserId?: string;
}

export default function InspirationPostCard({
  post,
  onLike,
  currentUserId,
}: InspirationPostCardProps) {
  const { language } = useLanguage();

  const getPostImage = () => {
    if (post.image_url) return post.image_url;
    if (post.outfit?.photo_url) return post.outfit.photo_url;
    if (post.clothing_item?.image_url) return post.clothing_item.image_url;
    if (post.outfit?.items?.[0]?.image_url) return post.outfit.items[0].image_url;
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

  return (
    <Card className="group overflow-hidden card-elevated">
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={post.caption || 'Inspiration post'}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : post.outfit?.items && post.outfit.items.length > 0 ? (
          <div className="grid h-full w-full grid-cols-2 gap-0.5 p-0.5">
            {post.outfit.items.slice(0, 4).map((item) => (
              <div key={item.id} className="overflow-hidden bg-background">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Shirt className="h-12 w-12" />
          </div>
        )}

        {/* Post type badge */}
        <Badge className="absolute left-2 top-2 gap-1" variant="secondary">
          {getPostTypeIcon()}
          {getPostTypeLabel()}
        </Badge>

        {/* Like button overlay */}
        <Button
          variant="secondary"
          size="icon"
          className={`absolute right-2 top-2 h-9 w-9 transition-all ${
            post.hasLiked ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
        >
          <Heart className={`h-4 w-4 ${post.hasLiked ? 'fill-current' : ''}`} />
        </Button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* User info */}
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={post.profile?.avatar_url || undefined} />
            <AvatarFallback className="text-xs">
              {post.profile?.username?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              @{post.profile?.username || 'anonymous'}
            </p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm line-clamp-2">{post.caption}</p>
        )}

        {/* Item/outfit name */}
        {(post.outfit?.name || post.clothing_item?.name) && (
          <p className="text-sm text-muted-foreground truncate">
            {post.outfit?.name || post.clothing_item?.name}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={onLike}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              post.hasLiked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart className={`h-4 w-4 ${post.hasLiked ? 'fill-current' : ''}`} />
            {post.likes_count}
          </button>
          <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}