import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface ConnectionStatus {
  isConnected: boolean;
  isLoading: boolean;
  deviceName: string | null;
  lastSeen: Date | null;
}

// Generate a simple fingerprint for the current device
const generateFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
  }
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || 'unknown',
    canvas.toDataURL()
  ];
  
  // Simple hash
  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

export function useConnectionStatus(): ConnectionStatus {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isLoading: true,
    deviceName: null,
    lastSeen: null,
  });

  const checkConnectionStatus = useCallback(async () => {
    if (!user) {
      setStatus({
        isConnected: false,
        isLoading: false,
        deviceName: null,
        lastSeen: null,
      });
      return;
    }

    try {
      const fingerprint = generateFingerprint();
      
      // Check if this device is enrolled and active
      const { data: devices, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('last_seen', { ascending: false });

      if (error) {
        console.error('Error checking device status:', error);
        setStatus(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Find device by fingerprint or get the most recently seen active device
      let currentDevice = devices?.find(d => d.fingerprint === fingerprint);
      
      // If no fingerprint match, use the most recently seen device
      if (!currentDevice && devices && devices.length > 0) {
        currentDevice = devices[0];
      }

      if (currentDevice) {
        const lastSeenDate = currentDevice.last_seen ? new Date(currentDevice.last_seen) : null;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        // Consider connected if last_seen is within the last 5 minutes
        const isRecentlyActive = lastSeenDate && lastSeenDate > fiveMinutesAgo;
        
        setStatus({
          isConnected: isRecentlyActive || currentDevice.status === 'active',
          isLoading: false,
          deviceName: currentDevice.name,
          lastSeen: lastSeenDate,
        });

        // Update last_seen for this device
        await supabase
          .from('devices')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', currentDevice.id);
      } else {
        setStatus({
          isConnected: false,
          isLoading: false,
          deviceName: null,
          lastSeen: null,
        });
      }
    } catch (error) {
      console.error('Error in connection status check:', error);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    checkConnectionStatus();
    
    // Poll every 30 seconds
    const interval = setInterval(checkConnectionStatus, 30000);
    
    // Listen for device changes in real-time
    const channel = supabase
      .channel('connection-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
        },
        () => {
          checkConnectionStatus();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [checkConnectionStatus]);

  return status;
}
