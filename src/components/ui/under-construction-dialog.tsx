import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Construction } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface UnderConstructionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
}

export function UnderConstructionDialog({
  open,
  onOpenChange,
  featureName,
}: UnderConstructionDialogProps) {
  const { language } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader className="items-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
            <Construction className="h-8 w-8 text-accent" />
          </div>
          <DialogTitle className="font-display text-xl">
            {language === 'es' ? 'En Construcción' : 'Under Construction'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {featureName && (
              <span className="block font-medium text-foreground mb-2">
                {featureName}
              </span>
            )}
            {language === 'es'
              ? 'Esta función estará disponible pronto. ¡Estamos trabajando en ello!'
              : "This feature will be available soon. We're working on it!"}
          </DialogDescription>
        </DialogHeader>
        <Button onClick={() => onOpenChange(false)} className="w-full">
          {language === 'es' ? 'Entendido' : 'Got it'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
