import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  KeyRound, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Shield,
  Mail
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DeviceType } from './DeviceTypeSelector';

interface TokenValidationProps {
  deviceType: DeviceType;
  onValidationSuccess: (data: TokenValidationResult) => void;
  onBack: () => void;
}

export interface TokenValidationResult {
  deviceId: string;
  enrollmentKey: string;
  deviceName: string;
  organizationName: string;
  expiresAt: Date;
  tailscaleTags: string[];
  tailscaleGroup: string;
}

export function TokenValidation({ 
  deviceType, 
  onValidationSuccess, 
  onBack 
}: TokenValidationProps) {
  const [token, setToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationStep, setValidationStep] = useState<'input' | 'validating' | 'success'>('input');

  const handleValidateToken = async () => {
    if (!token.trim()) {
      toast.error('Por favor ingresa tu token de invitación');
      return;
    }

    setIsValidating(true);
    setError(null);
    setValidationStep('validating');

    try {
      // Generate fingerprint for this device
      const fingerprint = await generateFingerprint();

      // Call device-enrollment edge function to validate token
      const { data, error: fnError } = await supabase.functions.invoke('device-enrollment', {
        body: {
          action: 'verify',
          enrollment_token: token.trim(),
          device_type: deviceType,
          fingerprint,
        },
      });

      if (fnError || !data?.success) {
        throw new Error(data?.error || fnError?.message || 'Error al validar el token');
      }

      // Token validated successfully, we have the real Tailscale auth key
      console.log('Token validated, received Tailscale auth key');

      setValidationStep('success');
      
      // Small delay to show success state
      setTimeout(() => {
        onValidationSuccess({
          deviceId: data.device_id,
          enrollmentKey: data.tailscale_auth_key,
          deviceName: data.device_name,
          organizationName: data.organization_name,
          expiresAt: new Date(data.expires_at),
          tailscaleTags: data.tailscale_tags || ['tag:prod'],
          tailscaleGroup: data.tailscale_group || 'sap',
        });
      }, 1500);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al validar el token';
      setError(message);
      setValidationStep('input');
      toast.error(message);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium">Token de Invitación</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Tu administrador te envió un token de invitación por correo electrónico 
              cuando creó tu cuenta. Ingresa ese token para continuar con el enrolamiento.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Token Input */}
      <Card>
        <CardContent className="p-6 space-y-6">
          {validationStep === 'input' && (
            <>
              <div className="text-center space-y-2">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                  <KeyRound className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Ingresa tu Token</h3>
                <p className="text-sm text-muted-foreground">
                  El token tiene un formato similar a: abc123-xyz789-...
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="enrollment-token">Token de Enrolamiento</Label>
                <Input
                  id="enrollment-token"
                  type="text"
                  placeholder="Ingresa tu token de invitación"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="font-mono text-center text-lg tracking-wider"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={onBack} className="flex-1">
                  Atrás
                </Button>
                <Button 
                  onClick={handleValidateToken} 
                  disabled={!token.trim() || isValidating}
                  className="flex-1"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Validar Token
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {validationStep === 'validating' && (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <div>
                <h3 className="text-lg font-semibold">Validando token...</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Verificando con el servidor de tu organización
                </p>
              </div>
              <div className="flex justify-center gap-2">
                {['Verificando formato', 'Consultando base de datos', 'Obteniendo clave Tailscale'].map((step, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {step}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {validationStep === 'success' && (
            <div className="text-center space-y-4 py-8">
              <div className="h-16 w-16 mx-auto rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-success">Token Válido</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Preparando instrucciones de instalación...
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium">Seguridad</p>
            <p className="text-xs text-muted-foreground mt-1">
              El token es de un solo uso y está vinculado a tu cuenta. 
              No lo compartas con nadie. Si tienes problemas, contacta a tu administrador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Generate a unique fingerprint for this device
async function generateFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.platform,
  ];
  
  const str = components.join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}