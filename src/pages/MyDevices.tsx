import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Laptop2, 
  Smartphone, 
  Monitor, 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  MoreVertical,
  Trash2,
  RefreshCw,
  MapPin,
  Clock,
  Fingerprint,
  CheckCircle2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Device {
  id: string;
  name: string;
  type: 'laptop' | 'desktop' | 'mobile' | 'tablet';
  os: string;
  lastSeen: string;
  location: string;
  status: 'active' | 'inactive' | 'compromised';
  current: boolean;
  enrolledAt: string;
  trustLevel: 'high' | 'medium' | 'low';
}

export default function MyDevices() {
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Demo devices
  const devices: Device[] = [
    {
      id: '1',
      name: 'MacBook Pro 16"',
      type: 'laptop',
      os: 'macOS Sonoma 14.2',
      lastSeen: new Date().toISOString(),
      location: 'Mexico City, MX',
      status: 'active',
      current: true,
      enrolledAt: '2024-01-15',
      trustLevel: 'high',
    },
    {
      id: '2',
      name: 'Windows Workstation',
      type: 'desktop',
      os: 'Windows 11 Pro',
      lastSeen: new Date(Date.now() - 3600000 * 2).toISOString(),
      location: 'Mexico City, MX',
      status: 'active',
      current: false,
      enrolledAt: '2024-02-20',
      trustLevel: 'high',
    },
    {
      id: '3',
      name: 'iPhone 15 Pro',
      type: 'mobile',
      os: 'iOS 17.2',
      lastSeen: new Date(Date.now() - 3600000 * 5).toISOString(),
      location: 'Mexico City, MX',
      status: 'active',
      current: false,
      enrolledAt: '2024-03-10',
      trustLevel: 'medium',
    },
    {
      id: '4',
      name: 'Old Laptop',
      type: 'laptop',
      os: 'Windows 10',
      lastSeen: new Date(Date.now() - 86400000 * 30).toISOString(),
      location: 'Unknown',
      status: 'inactive',
      current: false,
      enrolledAt: '2023-06-01',
      trustLevel: 'low',
    },
  ];

  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
      case 'laptop':
        return Laptop2;
      case 'desktop':
        return Monitor;
      case 'mobile':
      case 'tablet':
        return Smartphone;
      default:
        return Laptop2;
    }
  };

  const getTrustIcon = (level: Device['trustLevel']) => {
    switch (level) {
      case 'high':
        return <ShieldCheck className="h-4 w-4 text-success" />;
      case 'medium':
        return <Shield className="h-4 w-4 text-warning" />;
      case 'low':
        return <ShieldAlert className="h-4 w-4 text-destructive" />;
    }
  };

  const formatLastSeen = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const handleRevoke = (device: Device) => {
    setSelectedDevice(device);
    setShowRevokeDialog(true);
  };

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
        <Button className="gap-2">
          <Fingerprint className="h-4 w-4" />
          Enroll New Device
        </Button>
      </div>

      {/* Current Device Highlight */}
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
              {devices.find(d => d.current)?.name} • {devices.find(d => d.current)?.os}
            </p>
          </div>
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Verified</span>
          </div>
        </CardContent>
      </Card>

      {/* Device List */}
      <div className="grid gap-4">
        {devices.map((device) => {
          const Icon = getDeviceIcon(device.type);
          return (
            <Card key={device.id} className={`portal-card ${device.current ? 'border-primary/30' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                    device.status === 'active' ? 'bg-success/10' :
                    device.status === 'compromised' ? 'bg-destructive/10' : 'bg-muted'
                  }`}>
                    <Icon className={`h-6 w-6 ${
                      device.status === 'active' ? 'text-success' :
                      device.status === 'compromised' ? 'text-destructive' : 'text-muted-foreground'
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{device.name}</h3>
                      {device.current && (
                        <Badge variant="secondary" className="text-xs">This device</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{device.os}</p>
                    
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Last seen: {formatLastSeen(device.lastSeen)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{device.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getTrustIcon(device.trustLevel)}
                        <span className="capitalize">{device.trustLevel} trust</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline"
                      className={
                        device.status === 'active' ? 'badge-success' :
                        device.status === 'compromised' ? 'badge-error' : 'badge-warning'
                      }
                    >
                      <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                        device.status === 'active' ? 'bg-success' :
                        device.status === 'compromised' ? 'bg-destructive' : 'bg-warning'
                      }`} />
                      {device.status}
                    </Badge>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Re-enroll Device
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleRevoke(device)}
                          disabled={device.current}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Revoke Access
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
            <Button variant="destructive" onClick={() => setShowRevokeDialog(false)}>
              Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}