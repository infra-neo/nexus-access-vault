import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Monitor, 
  Apple, 
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type DeviceType = 'windows' | 'macos' | 'mobile';

interface DeviceOption {
  type: DeviceType;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  requirements: string[];
  features: string[];
  connectionMethods: string[];
}

interface DeviceTypeSelectorProps {
  selectedType: DeviceType | null;
  onSelect: (type: DeviceType) => void;
  maxDevices?: number;
  currentDeviceCount?: number;
}

const deviceOptions: DeviceOption[] = [
  {
    type: 'windows',
    title: 'Windows',
    subtitle: 'Laptop o PC de escritorio',
    icon: <Monitor className="h-12 w-12" />,
    requirements: [
      'Windows 10/11 (64-bit)',
      'Procesador 2 GHz o superior',
      '4 GB RAM mínimo',
      'Conexión a internet estable',
    ],
    features: [
      'Cliente nativo con túnel seguro',
      'Soporte RDP integrado',
      'Auto-enrollment via CLI',
      'Sesiones HTML5 en navegador',
    ],
    connectionMethods: [
      'Navegador Web (HTML5)',
      'Cliente RDP Windows',
      'Túnel Tailscale/WireGuard',
    ],
  },
  {
    type: 'macos',
    title: 'macOS',
    subtitle: 'MacBook, iMac, Mac Studio',
    icon: <Apple className="h-12 w-12" />,
    requirements: [
      'macOS 12 Monterey o superior',
      'Apple Silicon (M1/M2/M3) o Intel',
      '4 GB RAM mínimo',
      'Conexión a internet estable',
    ],
    features: [
      'App nativa optimizada para Silicon',
      'Integración con Keychain',
      'Auto-enrollment via CLI',
      'Sesiones HTML5 en navegador',
    ],
    connectionMethods: [
      'Navegador Web (HTML5)',
      'Cliente nativo macOS',
      'Túnel Tailscale/WireGuard',
    ],
  },
  {
    type: 'mobile',
    title: 'Móvil',
    subtitle: 'Android o iOS (iPhone/iPad)',
    icon: <Smartphone className="h-12 w-12" />,
    requirements: [
      'Android 10+ o iOS 15+',
      'Dispositivo compatible con biometría',
      'Conexión Wi-Fi o datos móviles',
      'Espacio de almacenamiento: 100 MB',
    ],
    features: [
      'App móvil con autenticación biométrica',
      'Push notifications para MFA',
      'Acceso a sesiones HTML5',
      'Gestión de tokens de acceso',
    ],
    connectionMethods: [
      'Navegador Web (HTML5)',
      'App móvil Neogenesys',
    ],
  },
];

export function DeviceTypeSelector({ 
  selectedType, 
  onSelect,
  maxDevices = 2,
  currentDeviceCount = 0
}: DeviceTypeSelectorProps) {
  const remainingSlots = maxDevices - currentDeviceCount;
  
  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Límite de dispositivos</p>
            <p className="text-sm text-muted-foreground">
              Puedes enrolar hasta {maxDevices} dispositivos
            </p>
          </div>
        </div>
        <Badge variant={remainingSlots > 0 ? 'secondary' : 'destructive'}>
          {remainingSlots} disponible{remainingSlots !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* MFA Notice */}
      <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning-foreground">
        <p className="text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-warning" />
          <span><strong>MFA Obligatorio:</strong> Todos los dispositivos requieren autenticación multifactor</span>
        </p>
      </div>

      {/* Device Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {deviceOptions.map((option) => (
          <Card
            key={option.type}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:border-primary/50",
              selectedType === option.type 
                ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
                : "border-border hover:bg-muted/30"
            )}
            onClick={() => onSelect(option.type)}
          >
            <CardContent className="p-6 space-y-4">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className={cn(
                  "mx-auto h-20 w-20 rounded-2xl flex items-center justify-center transition-colors",
                  selectedType === option.type 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {option.icon}
                </div>
                <h3 className="text-xl font-semibold">{option.title}</h3>
                <p className="text-sm text-muted-foreground">{option.subtitle}</p>
              </div>

              {/* Requirements */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Requisitos
                </p>
                <ul className="space-y-1">
                  {option.requirements.slice(0, 3).map((req, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 text-success flex-shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Connection Methods */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Métodos de conexión
                </p>
                <div className="flex flex-wrap gap-1">
                  {option.connectionMethods.map((method, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {method}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Selection Indicator */}
              {selectedType === option.type && (
                <div className="flex items-center justify-center gap-2 text-primary font-medium text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Seleccionado
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Features (shown when selected) */}
      {selectedType && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6">
            <h4 className="font-medium mb-4">
              Características de {deviceOptions.find(d => d.type === selectedType)?.title}
            </h4>
            <div className="grid gap-2 md:grid-cols-2">
              {deviceOptions
                .find(d => d.type === selectedType)
                ?.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
