import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Laptop2, 
  Fingerprint,
  CheckCircle2,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { TailscaleMonitor } from '@/components/devices/TailscaleMonitor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { DeviceCard, Device } from '@/components/devices/DeviceCard';
import { useDeviceEnrollment } from '@/hooks/useDeviceEnrollment';
export default function MyDevices() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { deviceInfo, silentEnroll } = useDeviceEnrollment();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const fetchDevices = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .order('last_seen', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
      
      // Identify current device by fingerprint
      const current = data?.find(d => d.fingerprint === deviceInfo.fingerprint);
      setCurrentDeviceId(current?.id || null);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [user]);

  // Silent enrollment on first visit
  useEffect(() => {
    const checkAndEnroll = async () => {
      if (!user || loading || devices.length === 0) return;
      
      const hasCurrentDevice = devices.some(d => d.fingerprint === deviceInfo.fingerprint);
      if (!hasCurrentDevice) {
        // Auto-enroll this device silently
        const result = await silentEnroll();
        if (result?.success) {
          fetchDevices();
          toast.success('This device has been enrolled');
        }
      }
    };
    
    // Only run after initial load
    if (!loading && devices !== null) {
      checkAndEnroll();
    }
  }, [user, loading, devices.length]);

  const handleRevoke = (device: Device) => {
    setSelectedDevice(device);
    setShowRevokeDialog(true);
  };

  const confirmRevoke = async () => {
    if (!selectedDevice) return;
    
    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', selectedDevice.id);

      if (error) throw error;
      
      toast.success('Device access revoked');
      setShowRevokeDialog(false);
      fetchDevices();
    } catch (error) {
      console.error('Error revoking device:', error);
      toast.error('Failed to revoke device access');
    }
  };

  const handleReEnroll = async (device: Device) => {
    try {
      const { error } = await supabase
        .from('devices')
        .update({
          status: 'pending',
          trust_level: 'low',
          enrollment_token: crypto.randomUUID(),
        })
        .eq('id', device.id);

      if (error) throw error;
      
      toast.success('Device marked for re-enrollment');
      fetchDevices();
    } catch (error) {
      console.error('Error re-enrolling device:', error);
      toast.error('Failed to re-enroll device');
    }
  };

  const currentDevice = devices.find(d => d.id === currentDeviceId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">My Devices</h1>
          <p className="text-muted-foreground mt-1">
            Manage your enrolled devices and security settings
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDevices} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="gap-2" onClick={() => navigate('/enroll')}>
            <Fingerprint className="h-4 w-4" />
            Enroll New Device
          </Button>
        </div>
      </div>

      {/* Current Device Highlight */}
      {currentDevice && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Laptop2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">Current Device</p>
                <Badge className="bg-primary/20 text-primary border-0">Active Session</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentDevice.name} • {currentDevice.os}
              </p>
            </div>
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Verified</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : devices.length === 0 ? (
        <Card className="portal-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Fingerprint className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No devices enrolled</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enroll your first device to get started
            </p>
            <Button onClick={() => navigate('/enroll')}>
              <Fingerprint className="h-4 w-4 mr-2" />
              Enroll This Device
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              isCurrent={device.id === currentDeviceId}
              onRevoke={handleRevoke}
              onReEnroll={handleReEnroll}
            />
          ))}
        </div>
      )}

      {/* Revoke Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Device Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke access for "{selectedDevice?.name}"? 
              This device will be logged out and will need to be re-enrolled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRevoke}>
              Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tailscale Connection Monitor */}
      {user && (
        <TailscaleMonitor 
          userId={user.id} 
          organizationId={null} 
        />
      )}
    </div>
  );
}
