import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Fingerprint, 
  ChevronRight,
  Monitor,
  KeyRound,
  Download,
  CheckCircle2
} from 'lucide-react';
import { DeviceTypeSelector, DeviceType } from './DeviceTypeSelector';
import { TokenValidation, TokenValidationResult } from './TokenValidation';
import { InstallationInstructions } from './InstallationInstructions';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

type WizardStep = 'device-type' | 'token-validation' | 'installation';

interface EnrollmentWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function EnrollmentWizard({ onComplete, onCancel }: EnrollmentWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<WizardStep>('device-type');
  const [selectedDeviceType, setSelectedDeviceType] = useState<DeviceType | null>(null);
  const [validationResult, setValidationResult] = useState<TokenValidationResult | null>(null);
  const [currentDeviceCount, setCurrentDeviceCount] = useState(0);

  // Fetch current device count
  useEffect(() => {
    const fetchDeviceCount = async () => {
      if (!user) return;
      
      const { count } = await supabase
        .from('devices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['active', 'pending']);
      
      setCurrentDeviceCount(count || 0);
    };

    fetchDeviceCount();
  }, [user]);

  const steps = [
    { 
      id: 'device-type', 
      label: 'Tipo de Dispositivo', 
      icon: Monitor,
      description: 'Selecciona tu dispositivo'
    },
    { 
      id: 'token-validation', 
      label: 'Validar Token', 
      icon: KeyRound,
      description: 'Ingresa tu invitación'
    },
    { 
      id: 'installation', 
      label: 'Instalación', 
      icon: Download,
      description: 'Descarga y configura'
    },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleDeviceSelect = (type: DeviceType) => {
    setSelectedDeviceType(type);
  };

  const handleNextFromDeviceType = () => {
    if (selectedDeviceType) {
      setCurrentStep('token-validation');
    }
  };

  const handleValidationSuccess = (result: TokenValidationResult) => {
    setValidationResult(result);
    setCurrentStep('installation');
  };

  const handleEnrollmentComplete = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Fingerprint className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Enrolar Nuevo Dispositivo</h1>
              <p className="text-muted-foreground">
                Sigue los pasos para configurar el acceso seguro en tu dispositivo
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = currentStepIndex > index;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex items-center gap-3">
                    <div className={`
                      h-10 w-10 rounded-full flex items-center justify-center transition-colors
                      ${isCompleted ? 'bg-success text-success-foreground' : ''}
                      ${isActive ? 'bg-primary text-primary-foreground' : ''}
                      ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                    `}>
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="hidden sm:block">
                      <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronRight className="h-5 w-5 mx-4 text-muted-foreground hidden md:block" />
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {currentStep === 'device-type' && (
          <div className="space-y-6">
            <DeviceTypeSelector
              selectedType={selectedDeviceType}
              onSelect={handleDeviceSelect}
              maxDevices={2}
              currentDeviceCount={currentDeviceCount}
            />
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button 
                onClick={handleNextFromDeviceType}
                disabled={!selectedDeviceType}
                className="gap-2"
              >
                Continuar
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'token-validation' && selectedDeviceType && (
          <TokenValidation
            deviceType={selectedDeviceType}
            onValidationSuccess={handleValidationSuccess}
            onBack={() => setCurrentStep('device-type')}
          />
        )}

        {currentStep === 'installation' && selectedDeviceType && validationResult && (
          <InstallationInstructions
            deviceType={selectedDeviceType}
            validationResult={validationResult}
            onEnrollmentComplete={handleEnrollmentComplete}
            onBack={() => setCurrentStep('token-validation')}
          />
        )}
      </div>
    </div>
  );
}
