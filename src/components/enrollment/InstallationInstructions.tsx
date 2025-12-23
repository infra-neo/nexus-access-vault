import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Copy, 
  CheckCircle2, 
  Terminal,
  Loader2,
  ExternalLink,
  Monitor,
  Apple,
  Smartphone,
  Clock,
  Wifi
} from 'lucide-react';
import { toast } from 'sonner';
import { DeviceType } from './DeviceTypeSelector';
import { TokenValidationResult } from './TokenValidation';
import { supabase } from '@/integrations/supabase/client';

interface InstallationInstructionsProps {
  deviceType: DeviceType;
  validationResult: TokenValidationResult;
  onEnrollmentComplete: () => void;
  onBack: () => void;
}

type EnrollmentStatus = 'waiting' | 'detected' | 'enrolled' | 'error';

export function InstallationInstructions({ 
  deviceType, 
  validationResult,
  onEnrollmentComplete,
  onBack
}: InstallationInstructionsProps) {
  const [copiedCommand, setCopiedCommand] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>('waiting');
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [tailscaleInfo, setTailscaleInfo] = useState<{hostname?: string; ip?: string} | null>(null);

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'windows': return <Monitor className="h-6 w-6" />;
      case 'macos': return <Apple className="h-6 w-6" />;
      case 'mobile': return <Smartphone className="h-6 w-6" />;
    }
  };

  const getDownloadInfo = () => {
    switch (deviceType) {
      case 'windows':
        return {
          name: 'Tailscale para Windows',
          filename: 'tailscale-setup.exe',
          size: '~25 MB',
          url: 'https://tailscale.com/download/windows',
        };
      case 'macos':
        return {
          name: 'Tailscale para macOS',
          filename: 'Tailscale.pkg',
          size: '~30 MB',
          url: 'https://tailscale.com/download/mac',
        };
      case 'mobile':
        return {
          name: 'Tailscale App',
          filename: 'App Store / Play Store',
          size: 'Variable',
          url: 'https://tailscale.com/download',
        };
    }
  };

  const getCliCommand = () => {
    const key = validationResult.enrollmentKey;
    switch (deviceType) {
      case 'windows':
        return `tailscale up --auth-key=${key}`;
      case 'macos':
        return `sudo tailscale up --auth-key=${key}`;
      case 'mobile':
        return key; // For mobile, just show the key
    }
  };

  const downloadInfo = getDownloadInfo();
  const cliCommand = getCliCommand();

  const copyToClipboard = (text: string, type: 'command' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'command') {
      setCopiedCommand(true);
      setTimeout(() => setCopiedCommand(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
    toast.success('Copiado al portapapeles');
  };

  // Check Tailscale connection status via edge function
  const checkTailscaleStatus = useCallback(async () => {
    if (enrollmentStatus === 'enrolled') return;
    
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('device-enrollment', {
        body: {
          action: 'check_tailscale_status',
          enrollment_token: validationResult.deviceId, // Using this field to pass device ID
        },
      });

      if (error) throw error;

      if (data?.tailscale_connected) {
        setEnrollmentStatus('enrolled');
        setTailscaleInfo({
          hostname: data.tailscale_hostname,
          ip: data.tailscale_ip,
        });
        toast.success('¡Dispositivo conectado a Tailscale exitosamente!');
      }
    } catch (err) {
      console.error('Error checking Tailscale status:', err);
    } finally {
      setCheckingStatus(false);
    }
  }, [validationResult.deviceId, enrollmentStatus]);

  // Poll for Tailscale connection status
  useEffect(() => {
    // Poll every 5 seconds
    const interval = setInterval(checkTailscaleStatus, 5000);
    
    // Initial check
    checkTailscaleStatus();

    return () => clearInterval(interval);
  }, [checkTailscaleStatus]);

  // Also check database status
  useEffect(() => {
    const checkDatabaseStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('devices')
          .select('status, enrolled_at, tailscale_hostname, tailscale_ip')
          .eq('id', validationResult.deviceId)
          .single();

        if (error) throw error;

        if (data.status === 'active' && data.enrolled_at) {
          setEnrollmentStatus('enrolled');
          if (data.tailscale_hostname || data.tailscale_ip) {
            setTailscaleInfo({
              hostname: data.tailscale_hostname,
              ip: data.tailscale_ip,
            });
          }
        }
      } catch (err) {
        console.error('Error checking database status:', err);
      }
    };

    // Poll every 5 seconds
    const interval = setInterval(checkDatabaseStatus, 5000);
    checkDatabaseStatus();

    return () => clearInterval(interval);
  }, [validationResult.deviceId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`device-${validationResult.deviceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'devices',
          filter: `id=eq.${validationResult.deviceId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData.status === 'active') {
            setEnrollmentStatus('enrolled');
            if (newData.tailscale_hostname || newData.tailscale_ip) {
              setTailscaleInfo({
                hostname: newData.tailscale_hostname,
                ip: newData.tailscale_ip,
              });
            }
            toast.success('¡Dispositivo enrolado exitosamente!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [validationResult.deviceId]);

  const steps = deviceType === 'mobile' 
    ? [
        {
          number: 1,
          title: 'Descarga Tailscale',
          description: 'Busca "Tailscale" en App Store (iOS) o Play Store (Android)',
          action: (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-2" asChild>
                <a href="https://apps.apple.com/app/tailscale/id1470499037" target="_blank" rel="noopener noreferrer">
                  <Apple className="h-4 w-4" />
                  App Store
                </a>
              </Button>
              <Button size="sm" variant="outline" className="gap-2" asChild>
                <a href="https://play.google.com/store/apps/details?id=com.tailscale.ipn" target="_blank" rel="noopener noreferrer">
                  <Smartphone className="h-4 w-4" />
                  Play Store
                </a>
              </Button>
            </div>
          ),
        },
        {
          number: 2,
          title: 'Abre Tailscale y usa esta clave',
          description: 'Abre Tailscale, ve a Settings > Use auth key, y pega esta clave:',
          action: (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-sm">
              <code className="flex-1 break-all">{validationResult.enrollmentKey}</code>
              <Button size="icon" variant="ghost" onClick={() => copyToClipboard(validationResult.enrollmentKey, 'key')}>
                {copiedKey ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ),
        },
        {
          number: 3,
          title: 'Espera la conexión',
          description: 'Tailscale se conectará automáticamente a la red de tu organización',
        },
      ]
    : [
        {
          number: 1,
          title: 'Descarga e instala Tailscale',
          description: `Descarga Tailscale desde el sitio oficial`,
          action: (
            <Button className="gap-2" onClick={() => window.open(downloadInfo.url, '_blank')}>
              <Download className="h-4 w-4" />
              Ir a Tailscale.com
            </Button>
          ),
        },
        {
          number: 2,
          title: 'Ejecuta el comando de autenticación',
          description: deviceType === 'windows' 
            ? 'Abre PowerShell como Administrador y ejecuta:'
            : 'Abre Terminal y ejecuta:',
          action: (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-zinc-900 text-zinc-100 rounded-lg font-mono text-sm">
                <Terminal className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <code className="flex-1 break-all">{cliCommand}</code>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="text-zinc-400 hover:text-zinc-100"
                  onClick={() => copyToClipboard(cliCommand, 'command')}
                >
                  {copiedCommand ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  <strong>Importante:</strong> Este comando incluye tu clave de autenticación única. 
                  No lo compartas con nadie. La clave es válida por 24 horas.
                </p>
              </div>
            </div>
          ),
        },
        {
          number: 3,
          title: 'Verifica la conexión',
          description: 'Una vez conectado, tu dispositivo aparecerá automáticamente como enrolado.',
        },
      ];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                {getDeviceIcon()}
              </div>
              <div>
                <h3 className="font-medium">{validationResult.deviceName}</h3>
                <p className="text-sm text-muted-foreground">
                  {validationResult.organizationName}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="gap-1">
                {validationResult.tailscaleTags?.join(', ') || 'tag:prod'}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Expira en 24h
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Installation Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card key={step.number} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex">
                {/* Step Number */}
                <div className="w-16 bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-muted-foreground">
                    {step.number}
                  </span>
                </div>
                
                {/* Step Content */}
                <div className="flex-1 p-4 space-y-3">
                  <div>
                    <h4 className="font-medium">{step.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  </div>
                  {step.action}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enrollment Status */}
      <Card className={
        enrollmentStatus === 'enrolled' 
          ? 'border-success/50 bg-success/5'
          : 'border-border'
      }>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
              enrollmentStatus === 'enrolled' 
                ? 'bg-success/20' 
                : 'bg-muted'
            }`}>
              {enrollmentStatus === 'enrolled' ? (
                <CheckCircle2 className="h-6 w-6 text-success" />
              ) : checkingStatus ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <Wifi className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1">
              {enrollmentStatus === 'enrolled' ? (
                <>
                  <h4 className="font-medium text-success">Dispositivo Conectado a Tailscale</h4>
                  <p className="text-sm text-muted-foreground">
                    {tailscaleInfo?.hostname && `Hostname: ${tailscaleInfo.hostname}`}
                    {tailscaleInfo?.ip && ` | IP: ${tailscaleInfo.ip}`}
                    {!tailscaleInfo?.hostname && !tailscaleInfo?.ip && 'Tu dispositivo está conectado y listo para usar'}
                  </p>
                </>
              ) : (
                <>
                  <h4 className="font-medium">Esperando conexión de Tailscale...</h4>
                  <p className="text-sm text-muted-foreground">
                    Ejecuta el comando anterior. Esta página se actualizará automáticamente cuando detectemos tu dispositivo.
                  </p>
                </>
              )}
            </div>

            {enrollmentStatus === 'enrolled' ? (
              <Button onClick={onEnrollmentComplete} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Finalizar
              </Button>
            ) : (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Verificando cada 5s
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Back Button */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        <Button variant="ghost" className="gap-2" asChild>
          <a href="https://tailscale.com/kb" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Documentación de Tailscale
          </a>
        </Button>
      </div>
    </div>
  );
}