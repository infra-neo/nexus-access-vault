import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Maximize2, 
  Minimize2, 
  RefreshCw, 
  Monitor,
  Terminal,
  AlertCircle,
  Loader2,
  ExternalLink,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ResourceDetails {
  id: string;
  name: string;
  resource_type: string;
  connection_method: string;
  ip_address: string | null;
  metadata: Record<string, unknown>;
}

export default function Workspace() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [resource, setResource] = useState<ResourceDetails | null>(null);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');

  const connectionType = searchParams.get('type') as 'guacamole' | 'tsplus' | 'rdp' | 'ssh' || 'guacamole';

  useEffect(() => {
    if (resourceId && profile) {
      initializeSession();
    }
  }, [resourceId, profile]);

  const initializeSession = async () => {
    if (!resourceId || !profile) return;

    setLoading(true);
    setError(null);
    setConnectionStatus('connecting');

    try {
      // Get resource details
      const { data: resourceData, error: resourceError } = await supabase
        .from('resources')
        .select('*')
        .eq('id', resourceId)
        .single();

      if (resourceError || !resourceData) {
        throw new Error('Resource not found');
      }

      setResource({
        ...resourceData,
        metadata: (resourceData.metadata as Record<string, unknown>) || {},
      });

      // Get session from edge function
      const { data, error: sessionError } = await supabase.functions.invoke('session-launcher', {
        body: { resourceId, connectionType },
      });

      if (sessionError || !data?.success) {
        throw new Error(data?.error || sessionError?.message || 'Failed to launch session');
      }

      setSessionUrl(data.sessionUrl);
      setConnectionStatus('connected');
      
      toast({
        title: 'Session Started',
        description: `Connected to ${resourceData.name}`,
      });
    } catch (err) {
      console.error('Session initialization error:', err);
      const message = err instanceof Error ? err.message : 'Failed to initialize session';
      setError(message);
      setConnectionStatus('error');
      
      toast({
        title: 'Connection Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFullscreen = () => {
    if (!iframeRef.current) return;

    if (!isFullscreen) {
      if (iframeRef.current.requestFullscreen) {
        iframeRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = sessionUrl || '';
    }
    initializeSession();
  };

  const handleOpenExternal = () => {
    if (sessionUrl) {
      window.open(sessionUrl, '_blank');
    }
  };

  const getResourceIcon = () => {
    if (!resource) return Monitor;
    switch (resource.resource_type) {
      case 'linux_vm':
      case 'ssh':
        return Terminal;
      default:
        return Monitor;
    }
  };

  const Icon = getResourceIcon();

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-medium mb-2">Establishing Connection</h3>
            <p className="text-muted-foreground text-center">
              Connecting to your remote workspace via secure tunnel...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium mb-2">Connection Failed</h3>
            <p className="text-muted-foreground text-center mb-6">{error}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate('/my-applications')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/my-applications')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">{resource?.name || 'Remote Workspace'}</h1>
              <p className="text-xs text-muted-foreground">
                {resource?.ip_address || connectionType.toUpperCase()} Session
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={
              connectionStatus === 'connected' 
                ? 'border-success/30 text-success' 
                : connectionStatus === 'error'
                ? 'border-destructive/30 text-destructive'
                : 'border-warning/30 text-warning'
            }
          >
            <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
              connectionStatus === 'connected' 
                ? 'bg-success animate-pulse' 
                : connectionStatus === 'error'
                ? 'bg-destructive'
                : 'bg-warning animate-pulse'
            }`} />
            {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'error' ? 'Disconnected' : 'Connecting'}
          </Badge>

          <Button variant="ghost" size="icon" onClick={handleRefresh} title="Refresh session">
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon" onClick={handleOpenExternal} title="Open in new tab">
            <ExternalLink className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon" onClick={handleFullscreen} title="Toggle fullscreen">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>

          <Button variant="ghost" size="icon" title="Session settings">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Session Viewer */}
      <div className="flex-1 rounded-xl overflow-hidden border border-border bg-card">
        {sessionUrl ? (
          <iframe
            ref={iframeRef}
            src={sessionUrl}
            className="w-full h-full border-0"
            title={`Remote session - ${resource?.name}`}
            allow="fullscreen; clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No session URL available</p>
          </div>
        )}
      </div>
    </div>
  );
}
