import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Globe, 
  Shield, 
  MonitorPlay, 
  Tv, 
  ExternalLink,
  Loader2
} from 'lucide-react';

interface Application {
  id: string;
  name: string;
  resource_type: string;
  connection_method: string;
  ip_address: string | null;
  metadata?: Record<string, unknown>;
}

interface EditAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: Application | null;
  onSubmit: (data: {
    id: string;
    name: string;
    url: string;
    connectionMethod: string;
    resourceType: string;
  }) => Promise<void>;
}

const CONNECTION_INFO = {
  direct: {
    label: 'Direct URL',
    description: 'Open in embedded browser or new tab',
    icon: ExternalLink,
  },
  pomerium: {
    label: 'Pomerium Proxy',
    description: 'Access through Zero Trust gateway',
    icon: Shield,
  },
  guacamole: {
    label: 'Apache Guacamole',
    description: 'HTML5 remote desktop (RDP/SSH/VNC)',
    icon: MonitorPlay,
  },
  tsplus: {
    label: 'TSPlus HTML5',
    description: 'Windows remote desktop via browser',
    icon: Tv,
  },
  ssh: {
    label: 'SSH Terminal',
    description: 'Secure shell access',
    icon: Globe,
  },
};

const RESOURCE_TYPES = [
  { value: 'web_app', label: 'Web Application' },
  { value: 'windows_vm', label: 'Windows VM' },
  { value: 'linux_vm', label: 'Linux VM' },
  { value: 'rdp', label: 'Remote Desktop' },
  { value: 'ssh', label: 'SSH Server' },
  { value: 'guacamole_session', label: 'Guacamole Session' },
  { value: 'tsplus_html5', label: 'TSPlus HTML5' },
  { value: 'tailscale_node', label: 'Tailscale Node' },
  { value: 'direct', label: 'Direct Access' },
  { value: 'custom', label: 'Custom' },
];

export function EditAppDialog({ open, onOpenChange, application, onSubmit }: EditAppDialogProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [connectionMethod, setConnectionMethod] = useState('direct');
  const [resourceType, setResourceType] = useState('web_app');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (application) {
      setName(application.name);
      setUrl((application.metadata?.external_url as string) || application.ip_address || '');
      setConnectionMethod(application.connection_method || 'direct');
      setResourceType(application.resource_type || 'web_app');
    }
  }, [application]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application) return;
    
    setLoading(true);
    try {
      await onSubmit({ 
        id: application.id,
        name, 
        url, 
        connectionMethod, 
        resourceType 
      });
    } finally {
      setLoading(false);
    }
  };

  const availableMethods = Object.keys(CONNECTION_INFO);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Application</DialogTitle>
            <DialogDescription>
              Update the application configuration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">Application Name</Label>
              <Input
                id="edit-name"
                placeholder="My Application"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="edit-url">Application URL</Label>
              <Input
                id="edit-url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                The URL that will open when you launch this app
              </p>
            </div>

            {/* Resource Type */}
            <div className="space-y-2">
              <Label htmlFor="edit-resourceType">Resource Type</Label>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Connection Method */}
            <div className="space-y-3">
              <Label>Connection Method</Label>
              <RadioGroup 
                value={connectionMethod} 
                onValueChange={setConnectionMethod}
                className="grid gap-3"
              >
                {availableMethods.map(method => {
                  const info = CONNECTION_INFO[method as keyof typeof CONNECTION_INFO];
                  if (!info) return null;
                  const Icon = info.icon;
                  
                  return (
                    <label 
                      key={method}
                      className={`
                        flex items-center gap-4 p-4 rounded-lg border cursor-pointer
                        transition-colors
                        ${connectionMethod === method 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'}
                      `}
                    >
                      <RadioGroupItem value={method} className="sr-only" />
                      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{info.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {info.description}
                        </div>
                      </div>
                      <div className={`h-4 w-4 rounded-full border-2 ${
                        connectionMethod === method 
                          ? 'border-primary bg-primary' 
                          : 'border-muted-foreground'
                      }`}>
                        {connectionMethod === method && (
                          <div className="h-full w-full flex items-center justify-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name || !url}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
