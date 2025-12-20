import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ConnectionType = 'guacamole' | 'tsplus' | 'rdp' | 'ssh';

interface LaunchOptions {
  resourceId: string;
  connectionType: ConnectionType;
  openInNewTab?: boolean;
}

interface LaunchResult {
  success: boolean;
  sessionUrl?: string;
  connectionId?: string;
  error?: string;
}

export function useSessionLauncher() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [launching, setLaunching] = useState<string | null>(null);

  const launchSession = async ({ resourceId, connectionType, openInNewTab = false }: LaunchOptions): Promise<LaunchResult> => {
    setLaunching(resourceId);

    try {
      // For TSPlus HTML5, we can optionally open in new tab
      if (connectionType === 'tsplus' && openInNewTab) {
        const { data, error } = await supabase.functions.invoke('session-launcher', {
          body: { resourceId, connectionType },
        });

        if (error || !data?.success) {
          throw new Error(data?.error || error?.message || 'Failed to launch session');
        }

        // Open TSPlus in new tab
        window.open(data.sessionUrl, '_blank');
        
        toast({
          title: 'TSPlus Session Launched',
          description: 'Opening HTML5 desktop in a new tab...',
        });

        return { success: true, sessionUrl: data.sessionUrl, connectionId: data.connectionId };
      }

      // For Guacamole and other types, navigate to workspace page
      navigate(`/workspace/${resourceId}?type=${connectionType}`);
      
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to launch session';
      
      toast({
        title: 'Launch Failed',
        description: message,
        variant: 'destructive',
      });

      return { success: false, error: message };
    } finally {
      setLaunching(null);
    }
  };

  const launchGuacamole = (resourceId: string) => {
    return launchSession({ resourceId, connectionType: 'guacamole' });
  };

  const launchTSPlus = (resourceId: string, openInNewTab = true) => {
    return launchSession({ resourceId, connectionType: 'tsplus', openInNewTab });
  };

  const launchRDP = (resourceId: string) => {
    return launchSession({ resourceId, connectionType: 'rdp' });
  };

  const launchSSH = (resourceId: string) => {
    return launchSession({ resourceId, connectionType: 'ssh' });
  };

  return {
    launching,
    launchSession,
    launchGuacamole,
    launchTSPlus,
    launchRDP,
    launchSSH,
  };
}
