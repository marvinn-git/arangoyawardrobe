import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ConnectionState = 'connected' | 'reconnecting' | 'offline';

export default function ConnectionStatus() {
  const [status, setStatus] = useState<ConnectionState>('connected');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkConnection = async () => {
      const start = Date.now();
      
      try {
        // Set reconnecting if request takes too long
        timeoutId = setTimeout(() => {
          setStatus('reconnecting');
          setVisible(true);
        }, 3000);

        await supabase.from('profiles').select('id').limit(1).maybeSingle();
        
        clearTimeout(timeoutId);
        const elapsed = Date.now() - start;
        
        if (elapsed > 5000) {
          // Slow but connected
          setStatus('connected');
          setVisible(true);
          setTimeout(() => setVisible(false), 2000);
        } else {
          setStatus('connected');
          setVisible(false);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        setStatus('offline');
        setVisible(true);
      }
    };

    // Initial check
    checkConnection();
    
    // Periodic health check every 30 seconds
    const intervalId = setInterval(checkConnection, 30000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all animate-in fade-in slide-in-from-bottom-4",
        status === 'connected' && "bg-green-500/90 text-white",
        status === 'reconnecting' && "bg-amber-500/90 text-white",
        status === 'offline' && "bg-destructive/90 text-destructive-foreground"
      )}
    >
      {status === 'connected' && (
        <>
          <Wifi className="h-4 w-4" />
          <span>Connected</span>
        </>
      )}
      {status === 'reconnecting' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Reconnecting...</span>
        </>
      )}
      {status === 'offline' && (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Connection lost</span>
        </>
      )}
    </div>
  );
}
