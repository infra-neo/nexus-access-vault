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
  Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Device {
  id: string;
  name: string;
  device_type: string;
  os: string | null;
  last_seen: string | null;
  location: string | null;
  status: string;
  enrolled_at: string | null;
  trust_level: string;
  fingerprint: string | null;
}

interface DeviceCardProps {
  device: Device;
  isCurrent: boolean;
  onRevoke: (device: Device) => void;
  onReEnroll: (device: Device) => void;
}

export function DeviceCard({ device, isCurrent, onRevoke, onReEnroll }: DeviceCardProps) {
  const getDeviceIcon = (type: string) => {
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

  const getTrustIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <ShieldCheck className="h-4 w-4 text-success" />;
      case 'medium':
        return <Shield className="h-4 w-4 text-warning" />;
      case 'low':
        return <ShieldAlert className="h-4 w-4 text-destructive" />;
      default:
        return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatLastSeen = (date: string | null) => {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const Icon = getDeviceIcon(device.device_type);

  return (
    <Card className={`portal-card ${isCurrent ? 'border-primary/30' : ''}`}>
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
              {isCurrent && (
                <Badge variant="secondary" className="text-xs">This device</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">{device.os || 'Unknown OS'}</p>
            
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Last seen: {formatLastSeen(device.last_seen)}</span>
              </div>
              {device.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{device.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                {getTrustIcon(device.trust_level)}
                <span className="capitalize">{device.trust_level} trust</span>
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
                <DropdownMenuItem onClick={() => onReEnroll(device)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Re-enroll Device
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => onRevoke(device)}
                  disabled={isCurrent}
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
}
