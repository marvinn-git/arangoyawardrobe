import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Megaphone } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Ad {
  id: string;
  title: string;
  titleEs: string;
  description: string;
  descriptionEs: string;
  imageUrl: string;
  ctaText: string;
  ctaTextEs: string;
  link: string;
  brand: string;
}

const mockAds: Ad[] = [
  {
    id: 'ad-1',
    title: 'Summer Collection',
    titleEs: 'Colección de Verano',
    description: 'Discover the latest trends for this season',
    descriptionEs: 'Descubre las últimas tendencias de esta temporada',
    imageUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=500&fit=crop',
    ctaText: 'Shop Now',
    ctaTextEs: 'Comprar Ahora',
    link: '#',
    brand: 'StyleCo',
  },
  {
    id: 'ad-2',
    title: 'New Arrivals',
    titleEs: 'Nuevas Llegadas',
    description: 'Fresh styles just dropped',
    descriptionEs: 'Estilos frescos recién llegados',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=500&fit=crop',
    ctaText: 'Explore',
    ctaTextEs: 'Explorar',
    link: '#',
    brand: 'FashionHub',
  },
  {
    id: 'ad-3',
    title: 'Sustainable Fashion',
    titleEs: 'Moda Sostenible',
    description: 'Eco-friendly clothing that looks great',
    descriptionEs: 'Ropa ecológica que se ve genial',
    imageUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=500&fit=crop',
    ctaText: 'Learn More',
    ctaTextEs: 'Saber Más',
    link: '#',
    brand: 'EcoWear',
  },
  {
    id: 'ad-4',
    title: 'Premium Sneakers',
    titleEs: 'Zapatillas Premium',
    description: 'Step up your shoe game',
    descriptionEs: 'Eleva tu estilo de calzado',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop',
    ctaText: 'View Collection',
    ctaTextEs: 'Ver Colección',
    link: '#',
    brand: 'SoleStyle',
  },
  {
    id: 'ad-5',
    title: 'Accessories Sale',
    titleEs: 'Oferta de Accesorios',
    description: 'Up to 50% off on selected items',
    descriptionEs: 'Hasta 50% de descuento en artículos seleccionados',
    imageUrl: 'https://images.unsplash.com/photo-1611923134239-b9be5816e23c?w=400&h=500&fit=crop',
    ctaText: 'Shop Sale',
    ctaTextEs: 'Ver Oferta',
    link: '#',
    brand: 'AccentStyle',
  },
  {
    id: 'ad-6',
    title: 'Streetwear Essentials',
    titleEs: 'Esenciales Streetwear',
    description: 'Urban fashion for everyday wear',
    descriptionEs: 'Moda urbana para el día a día',
    imageUrl: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=500&fit=crop',
    ctaText: 'Get Started',
    ctaTextEs: 'Comenzar',
    link: '#',
    brand: 'UrbanEdge',
  },
];

export function getRandomAd(): Ad {
  return mockAds[Math.floor(Math.random() * mockAds.length)];
}

export default function AdCard() {
  const { language } = useLanguage();
  
  const ad = useMemo(() => getRandomAd(), []);

  const title = language === 'es' ? ad.titleEs : ad.title;
  const description = language === 'es' ? ad.descriptionEs : ad.description;
  const ctaText = language === 'es' ? ad.ctaTextEs : ad.ctaText;

  return (
    <Card className="overflow-hidden group cursor-pointer border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/10 hover:border-primary/50 transition-all duration-200">
      <a href={ad.link} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={ad.imageUrl}
            alt={title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          {/* Sponsored Badge */}
          <Badge 
            variant="secondary" 
            className="absolute top-2 left-2 text-[10px] sm:text-xs gap-1 bg-background/90 backdrop-blur-sm"
          >
            <Megaphone className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span className="hidden xs:inline">{language === 'es' ? 'Patrocinado' : 'Sponsored'}</span>
            <span className="xs:hidden">Ad</span>
          </Badge>

          {/* Brand */}
          <div className="absolute top-2 right-2">
            <span className="text-[10px] sm:text-xs text-white/80 font-medium bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm">
              {ad.brand}
            </span>
          </div>

          {/* Content Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
            <h3 className="text-white font-semibold text-xs sm:text-sm line-clamp-1">
              {title}
            </h3>
            <p className="text-white/80 text-[10px] sm:text-xs mt-0.5 line-clamp-2">
              {description}
            </p>
            
            {/* CTA Button */}
            <div className="mt-2 flex items-center gap-1 text-primary-foreground bg-primary/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium w-fit group-hover:bg-primary transition-colors">
              {ctaText}
              <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </div>
          </div>
        </div>
      </a>
    </Card>
  );
}
