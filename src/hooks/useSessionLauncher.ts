import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ConnectionType = 'guacamole' | 'tsplus' | 'rdp' | 'ssh' | 'direct';

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
      // For direct connections, fetch the resource and open its URL
      if (connectionType === 'direct') {
        const { data: resource, error: fetchError } = await supabase
          .from('resources')
          .select('name, ip_address, metadata')
          .eq('id', resourceId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!resource) {
          throw new Error('Resource not found');
        }

        // Get URL from metadata.external_url or fallback to ip_address
        const externalUrl = (resource.metadata as Record<string, unknown>)?.external_url as string;
        const targetUrl = externalUrl || resource.ip_address;

        if (!targetUrl) {
          throw new Error('No URL configured for this application');
        }

        // Open URL in new tab
        window.open(targetUrl, '_blank');
        
        toast({
          title: 'Application Launched',
          description: `Opening ${resource.name}...`,
        });

        return { success: true, sessionUrl: targetUrl };
      }

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

  const launchDirect = (resourceId: string, openInNewTab = true) => {
    return launchSession({ resourceId, connectionType: 'direct', openInNewTab });
  };

  return {
    launching,
    launchSession,
    launchGuacamole,
    launchTSPlus,
    launchRDP,
    launchSSH,
    launchDirect,
  };
}
