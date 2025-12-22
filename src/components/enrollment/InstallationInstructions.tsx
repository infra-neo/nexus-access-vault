import { useState, useEffect } from 'react';
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
          name: 'Neogenesys Client para Windows',
          filename: 'neogenesys-client-win64.exe',
          size: '45.2 MB',
          url: '#', // Replace with actual download URL
        };
      case 'macos':
        return {
          name: 'Neogenesys Client para macOS',
          filename: 'neogenesys-client.dmg',
          size: '52.8 MB',
          url: '#', // Replace with actual download URL
        };
      case 'mobile':
        return {
          name: 'Neogenesys App',
          filename: 'App Store / Play Store',
          size: 'Variable',
          url: '#',
        };
    }
  };

  const getCliCommand = () => {
    const key = validationResult.enrollmentKey;
    switch (deviceType) {
      case 'windows':
        return `curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up --auth-key=${key}`;
      case 'macos':
        return `curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up --auth-key=${key}`;
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

  // Poll for enrollment status
  useEffect(() => {
    const checkEnrollmentStatus = async () => {
      setCheckingStatus(true);
      try {
        const { data, error } = await supabase
          .from('devices')
          .select('status, enrolled_at')
          .eq('id', validationResult.deviceId)
          .single();

        if (error) throw error;

        if (data.status === 'active' && data.enrolled_at) {
          setEnrollmentStatus('enrolled');
          toast.success('¡Dispositivo enrolado exitosamente!');
        }
      } catch (err) {
        console.error('Error checking enrollment status:', err);
      } finally {
        setCheckingStatus(false);
      }
    };

    // Poll every 5 seconds
    const interval = setInterval(checkEnrollmentStatus, 5000);
    
    // Initial check
    checkEnrollmentStatus();

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
          if (payload.new.status === 'active') {
            setEnrollmentStatus('enrolled');
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
          title: 'Descarga la App',
          description: 'Busca "Neogenesys" en App Store (iOS) o Play Store (Android)',
          action: (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-2">
                <Apple className="h-4 w-4" />
                App Store
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Play Store
              </Button>
            </div>
          ),
        },
        {
          number: 2,
          title: 'Abre la App e ingresa tu clave',
          description: 'En la pantalla de configuración, ingresa esta clave:',
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
          title: 'Configura MFA',
          description: 'Activa la autenticación biométrica (Face ID, Touch ID o huella digital)',
        },
      ]
    : [
        {
          number: 1,
          title: 'Descarga el instalador',
          description: `Descarga ${downloadInfo.filename} (${downloadInfo.size})`,
          action: (
            <Button className="gap-2" onClick={() => window.open(downloadInfo.url, '_blank')}>
              <Download className="h-4 w-4" />
              Descargar Instalador
            </Button>
          ),
        },
        {
          number: 2,
          title: 'Ejecuta el instalador',
          description: deviceType === 'windows' 
            ? 'Doble clic en el archivo descargado y sigue las instrucciones. O ejecuta desde PowerShell:'
            : 'Abre el .dmg, arrastra la app a Aplicaciones. Luego abre Terminal:',
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
              <p className="text-xs text-muted-foreground">
                También puedes hacer doble clic en el instalador para enrolamiento automático
              </p>
            </div>
          ),
        },
        {
          number: 3,
          title: 'Completa el MFA',
          description: 'El cliente te pedirá configurar autenticación multifactor. Sigue las instrucciones en pantalla.',
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
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              Expira en 24h
            </Badge>
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
                  <h4 className="font-medium text-success">Dispositivo Enrolado</h4>
                  <p className="text-sm text-muted-foreground">
                    Tu dispositivo está conectado y listo para usar
                  </p>
                </>
              ) : (
                <>
                  <h4 className="font-medium">Esperando enrolamiento...</h4>
                  <p className="text-sm text-muted-foreground">
                    Completa los pasos anteriores. Esta página se actualizará automáticamente.
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
                Esperando
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
          <a href="#" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Documentación
          </a>
        </Button>
      </div>
    </div>
  );
}
