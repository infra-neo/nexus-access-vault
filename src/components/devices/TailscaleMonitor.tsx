import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Globe, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Device {
  id: string;
  name: string;
  status: string;
  last_seen: string | null;
  fingerprint: string | null;
  metadata: unknown;
}

interface TailscaleMonitorProps {
  userId: string;
  organizationId: string | null;
}

export function TailscaleMonitor({ userId, organizationId }: TailscaleMonitorProps) {
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDevices();
    
    // Set up realtime subscription for device updates
    const channel = supabase
      .channel('device-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devices',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Device change:', payload);
          loadDevices();
        }
      )
      .subscribe();

    // Poll for connection status every 30 seconds
    const interval = setInterval(() => {
      checkConnectionStatus();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [userId]);

  const loadDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', userId)
        .order('last_seen', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error: any) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    // Update last_seen for connected devices based on their status
    const now = new Date().toISOString();
    
    for (const device of devices) {
      if (device.status === 'active') {
        // Check if device has been seen recently (within 2 minutes)
        const lastSeen = device.last_seen ? new Date(device.last_seen) : null;
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        
        if (!lastSeen || lastSeen < twoMinutesAgo) {
          // Device might be offline, update status
          await supabase
            .from('devices')
            .update({ status: 'offline', last_seen: now })
            .eq('id', device.id)
            .eq('status', 'active');
        }
      }
    }
    
    loadDevices();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDevices();
    
    toast({
      title: 'Estado actualizado',
      description: 'El estado de los dispositivos ha sido actualizado',
    });
    
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <WifiOff className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success/20 text-success border-success/30">Conectado</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30">Pendiente</Badge>;
      case 'offline':
        return <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/30">Desconectado</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'Nunca';
    
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Hace un momento';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} horas`;
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const activeDevices = devices.filter(d => d.status === 'active').length;
  const pendingDevices = devices.filter(d => d.status === 'pending').length;

  if (loading) {
    return (
      <Card className="glass">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Monitor de Conexión Tailscale
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
        
        {/* Summary badges */}
        <div className="flex gap-2 mt-2">
          <Badge variant="outline" className="bg-success/10">
            <Wifi className="h-3 w-3 mr-1" />
            {activeDevices} conectado(s)
          </Badge>
          {pendingDevices > 0 && (
            <Badge variant="outline" className="bg-warning/10">
              <AlertCircle className="h-3 w-3 mr-1" />
              {pendingDevices} pendiente(s)
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {devices.length === 0 ? (
          <div className="text-center py-8">
            <WifiOff className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay dispositivos registrados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map(device => (
              <div 
                key={device.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  device.status === 'active' 
                    ? 'border-success/30 bg-success/5' 
                    : device.status === 'pending'
                    ? 'border-warning/30 bg-warning/5'
                    : 'border-border bg-secondary/20'
                }`}
              >
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                  {device.status === 'active' ? (
                    <Wifi className="h-5 w-5 text-success" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{device.name}</p>
                    {getStatusIcon(device.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatLastSeen(device.last_seen)}
                    {device.fingerprint && (
                      <>
                        <span className="mx-1">•</span>
                        <span className="font-mono">{device.fingerprint.slice(0, 8)}...</span>
                      </>
                    )}
                  </div>
                </div>
                
                {getStatusBadge(device.status)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
