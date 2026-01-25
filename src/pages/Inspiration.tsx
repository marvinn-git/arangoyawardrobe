import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Plus, TrendingUp, Clock, Sparkles, Heart, RefreshCw, Bookmark } from 'lucide-react';
import InspirationPostCard from '@/components/inspiration/InspirationPostCard';
import CreatePostDialog from '@/components/inspiration/CreatePostDialog';
import AdCard from '@/components/inspiration/AdCard';

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
  relevanceScore?: number;
}

export default function Inspiration() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  
  const [posts, setPosts] = useState<InspirationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'foryou' | 'trending' | 'recent' | 'saved'>('foryou');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [userStyleTags, setUserStyleTags] = useState<string[]>([]);
  const [userStyleNames, setUserStyleNames] = useState<string[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());

  // Fetch user's style tags and saved posts on mount
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      // Fetch style tags
      const { data: styleData } = await supabase
        .from('user_style_tags')
        .select('style_tag:style_tags(name)')
        .eq('user_id', user.id);
      
      if (styleData) {
        const names = styleData
          .map((item: any) => item.style_tag?.name)
          .filter(Boolean);
        const tags = names.map((n: string) => n.toLowerCase());
        setUserStyleTags(tags);
        setUserStyleNames(names);
      }

      // Fetch saved posts
      const { data: savedData } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', user.id);
      
      if (savedData) {
        setSavedPostIds(new Set(savedData.map(s => s.post_id)));
      }
    };
    
    fetchUserData();
  }, [user]);

  // Handle refresh feed - triggers personalized content generation
  const handleRefreshFeed = async () => {
    if (!user || refreshing) return;
    
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-inspiration`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userStyles: userStyleNames,
          }),
        }
      );

      const result = await response.json();
      
      if (result.skipped) {
        toast({
          title: language === 'es' ? 'Feed actualizado' : 'Feed is fresh',
          description: language === 'es' 
            ? 'Tu feed ya tiene contenido personalizado' 
            : 'Your feed already has personalized content',
        });
      } else if (result.success) {
        toast({
          title: language === 'es' ? '¡Feed actualizado!' : 'Feed refreshed!',
          description: language === 'es' 
            ? `Se añadieron ${result.stats?.posts || 0} nuevas publicaciones` 
            : `Added ${result.stats?.posts || 0} new posts`,
        });
        // Refresh posts after seeding
        await fetchPosts();
      }
    } catch (error) {
      console.error('Refresh feed error:', error);
      toast({
        title: language === 'es' ? 'Error' : 'Error',
        description: language === 'es' 
          ? 'No se pudo actualizar el feed' 
          : 'Failed to refresh feed',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // For "For You" tab, we need to prioritize posts from users with similar styles
      let postsQuery = supabase
        .from('inspiration_posts')
        .select('*')
        .limit(100); // Fetch more to allow for sorting
      
      if (activeTab === 'trending') {
        postsQuery = postsQuery.order('likes_count', { ascending: false });
      } else {
        postsQuery = postsQuery.order('created_at', { ascending: false });
      }

      const { data: postsData, error: postsError } = await postsQuery;
      
      if (postsError) throw postsError;
      if (!postsData || postsData.length === 0) {
        setPosts([]);
        return;
      }

      // Fetch public profiles for post authors (using secure view with only public fields)
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: publicProfilesData } = await supabase
        .from('public_profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);
      
      const profilesMap: Record<string, Profile & { style_preferences?: string }> = {};
      if (publicProfilesData) {
        for (const p of publicProfilesData) {
          profilesMap[p.user_id] = { 
            username: p.username, 
            avatar_url: p.avatar_url,
          };
        }
      }

      // Fetch style tags for all post authors to calculate relevance
      const { data: authorStyleTags } = await supabase
        .from('user_style_tags')
        .select('user_id, style_tag:style_tags(name)')
        .in('user_id', userIds);
      
      const authorStylesMap: Record<string, string[]> = {};
      if (authorStyleTags) {
        for (const tag of authorStyleTags) {
          const tagName = (tag as any).style_tag?.name?.toLowerCase();
          if (tagName) {
            if (!authorStylesMap[tag.user_id]) {
              authorStylesMap[tag.user_id] = [];
            }
            authorStylesMap[tag.user_id].push(tagName);
          }
        }
      }

      // Fetch user's likes
      const { data: likesData } = await supabase
        .from('inspiration_likes')
        .select('post_id')
        .eq('user_id', user.id);

      const likedPostIds = new Set(likesData?.map(l => l.post_id) || []);

      // Fetch related outfits and clothing items
      const outfitIds = postsData.filter(p => p.outfit_id).map(p => p.outfit_id as string);
      const clothingIds = postsData.filter(p => p.clothing_item_id).map(p => p.clothing_item_id as string);

      const outfitsMap: Record<string, any> = {};
      const clothingMap: Record<string, any> = {};

      if (outfitIds.length > 0) {
        const { data: outfitsData } = await supabase
          .from('outfits')
          .select('id, name, photo_url, tags')
          .in('id', outfitIds);
        
        if (outfitsData) {
          for (const outfit of outfitsData) {
            outfitsMap[outfit.id] = { ...outfit, items: [] };
          }

          // Fetch outfit items
          const { data: outfitItemsData } = await supabase
            .from('outfit_items')
            .select('outfit_id, clothing_item:clothing_items(id, name, image_url)')
            .in('outfit_id', outfitIds);

          if (outfitItemsData) {
            for (const oi of outfitItemsData) {
              if (outfitsMap[oi.outfit_id] && oi.clothing_item) {
                outfitsMap[oi.outfit_id].items.push(oi.clothing_item);
              }
            }
          }
        }
      }

      if (clothingIds.length > 0) {
        const { data: clothingData } = await supabase
          .from('clothing_items')
          .select('id, name, image_url')
          .in('id', clothingIds);
        
        if (clothingData) {
          for (const item of clothingData) {
            clothingMap[item.id] = item;
          }
        }
      }

      // Calculate relevance score for each post based on matching style tags
      const enrichedPosts: InspirationPost[] = postsData.map(post => {
        const authorStyles = authorStylesMap[post.user_id] || [];
        const outfitTags = post.outfit_id ? (outfitsMap[post.outfit_id]?.tags || []) : [];
        
        // Calculate how many style tags match between current user and post author
        let relevanceScore = 0;
        
        if (userStyleTags.length > 0) {
          // Match with author's style tags
          for (const tag of authorStyles) {
            if (userStyleTags.includes(tag)) {
              relevanceScore += 3; // Strong match - same style preference
            }
          }
          
          // Match with outfit tags
          for (const tag of outfitTags) {
            if (userStyleTags.includes(tag?.toLowerCase())) {
              relevanceScore += 2; // Match with outfit tag
            }
          }
        }
        
        // Boost for popular posts
        if (post.likes_count > 100) relevanceScore += 2;
        else if (post.likes_count > 50) relevanceScore += 1;
        
        // Boost for recent posts (within last 3 days)
        const daysAgo = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysAgo < 1) relevanceScore += 3;
        else if (daysAgo < 3) relevanceScore += 1;

        return {
          id: post.id,
          user_id: post.user_id,
          outfit_id: post.outfit_id,
          clothing_item_id: post.clothing_item_id,
          image_url: post.image_url,
          caption: post.caption,
          post_type: post.post_type as 'fit_check' | 'outfit' | 'clothing_item',
          likes_count: post.likes_count ?? 0,
          created_at: post.created_at,
          profile: profilesMap[post.user_id],
          hasLiked: likedPostIds.has(post.id),
          hasSaved: savedPostIds.has(post.id),
          outfit: post.outfit_id ? outfitsMap[post.outfit_id] : undefined,
          clothing_item: post.clothing_item_id ? clothingMap[post.clothing_item_id] : undefined,
          relevanceScore,
        };
      });

      // Sort based on active tab
      let sortedPosts: InspirationPost[];
      if (activeTab === 'foryou') {
        // Sort by relevance score (descending), then by recency
        sortedPosts = enrichedPosts.sort((a, b) => {
          const scoreA = a.relevanceScore || 0;
          const scoreB = b.relevanceScore || 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      } else if (activeTab === 'trending') {
        sortedPosts = enrichedPosts.sort((a, b) => b.likes_count - a.likes_count);
      } else {
        sortedPosts = enrichedPosts.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }

      // Limit to 50 posts for display
      setPosts(sortedPosts.slice(0, 50));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching posts:', error);
      }
      toast({
        title: language === 'es' ? 'Error' : 'Error',
        description: language === 'es' ? 'No se pudieron cargar las publicaciones' : 'Failed to load posts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, language, toast, userStyleTags, savedPostIds]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleLike = async (postId: string, hasLiked: boolean) => {
    if (!user) return;

    try {
      if (hasLiked) {
        await supabase
          .from('inspiration_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('inspiration_likes')
          .insert({ post_id: postId, user_id: user.id });
      }

      // Update local state
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            hasLiked: !hasLiked,
            likes_count: hasLiked ? post.likes_count - 1 : post.likes_count + 1,
          };
        }
        return post;
      }));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error toggling like:', error);
      }
    }
  };

  const handleSave = async (postId: string, hasSaved: boolean) => {
    if (!user) return;

    try {
      if (hasSaved) {
        await supabase
          .from('saved_posts')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        
        setSavedPostIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      } else {
        await supabase
          .from('saved_posts')
          .insert({ post_id: postId, user_id: user.id });
        
        setSavedPostIds(prev => new Set([...prev, postId]));
      }

      // Update local state
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return { ...post, hasSaved: !hasSaved };
        }
        return post;
      }));

      toast({
        title: hasSaved 
          ? (language === 'es' ? 'Eliminado de guardados' : 'Removed from saved')
          : (language === 'es' ? '¡Guardado!' : 'Saved!'),
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error toggling save:', error);
      }
    }
  };

  const handlePostCreated = () => {
    setShowCreateDialog(false);
    fetchPosts();
    toast({
      title: language === 'es' ? '¡Publicado!' : 'Posted!',
      description: language === 'es' ? 'Tu publicación está en vivo' : 'Your post is live',
    });
  };

  const filteredPosts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return posts.filter(post => {
      // Filter by saved tab
      if (activeTab === 'saved' && !post.hasSaved) return false;
      
      // Filter by search query
      if (!query) return true;
      return (
        post.caption?.toLowerCase().includes(query) ||
        post.profile?.username?.toLowerCase().includes(query) ||
        post.outfit?.name?.toLowerCase().includes(query) ||
        post.clothing_item?.name?.toLowerCase().includes(query)
      );
    });
  }, [posts, searchQuery, activeTab]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold">
            {language === 'es' ? 'Inspiración' : 'Inspiration'}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-0.5 sm:mt-1">
            {language === 'es' 
              ? 'Descubre outfits de la comunidad' 
              : 'Discover community outfits'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefreshFeed} 
            disabled={refreshing}
            className="gap-2"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden xs:inline">{language === 'es' ? 'Actualizar' : 'Refresh'}</span>
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2" size="sm">
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">{language === 'es' ? 'Publicar' : 'Post'}</span>
            <span className="xs:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={language === 'es' ? 'Buscar inspiración...' : 'Search inspiration...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-9 sm:h-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="overflow-x-auto">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="foryou" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
            <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">{language === 'es' ? 'Para ti' : 'For You'}</span>
            <span className="xs:hidden">You</span>
          </TabsTrigger>
          <TabsTrigger value="trending" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">{language === 'es' ? 'Tendencias' : 'Trending'}</span>
            <span className="xs:hidden">Hot</span>
          </TabsTrigger>
          <TabsTrigger value="recent" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">{language === 'es' ? 'Reciente' : 'Recent'}</span>
            <span className="xs:hidden">New</span>
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3">
            <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">{language === 'es' ? 'Guardados' : 'Saved'}</span>
            <span className="xs:hidden">Save</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 sm:mt-6">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-[3/4] w-full rounded-lg" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12 sm:py-16 px-4">
              <Sparkles className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-medium">
                {language === 'es' ? 'Sin publicaciones aún' : 'No posts yet'}
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base mt-1">
                {language === 'es' 
                  ? '¡Sé el primero en compartir tu estilo!' 
                  : 'Be the first to share your style!'}
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="mt-4" size="sm">
                {language === 'es' ? 'Crear publicación' : 'Create post'}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredPosts.flatMap((post, index) => {
                const items = [
                  <InspirationPostCard
                    key={post.id}
                    post={post}
                    onLike={() => handleLike(post.id, post.hasLiked || false)}
                    onSave={() => handleSave(post.id, post.hasSaved || false)}
                    currentUserId={user?.id}
                  />
                ];
                // Insert ad every 6 posts
                if ((index + 1) % 6 === 0) {
                  items.push(<AdCard key={`ad-${index}`} />);
                }
                return items;
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handlePostCreated}
      />
    </div>
  );
}