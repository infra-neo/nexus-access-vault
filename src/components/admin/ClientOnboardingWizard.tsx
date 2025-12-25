/**
 * Client Onboarding Wizard Component
 * Admin interface for onboarding new client organizations
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertCircle, Building2, User, Key, Mail } from 'lucide-react';
import { onboardNewClient, ClientOnboardingRequest, ClientOnboardingResult } from '@/lib/api/onboarding';

interface Step {
  id: number;
  title: string;
  description: string;
}

const steps: Step[] = [
  { id: 1, title: 'Organization Details', description: 'Basic information about the client' },
  { id: 2, title: 'Support User', description: 'Primary support administrator details' },
  { id: 3, title: 'Tailscale Configuration', description: 'Network and device management setup' },
  { id: 4, title: 'Review & Create', description: 'Confirm and initiate onboarding' },
];

export function ClientOnboardingWizard({ onComplete }: { onComplete?: () => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ClientOnboardingResult | null>(null);
  const { toast } = useToast();

  // Form data
  const [formData, setFormData] = useState<Partial<ClientOnboardingRequest>>({
    organizationName: '',
    organizationLogo: '',
    supportEmail: '',
    supportFirstName: '',
    supportLastName: '',
    tailnet: '',
    tailscaleApiKey: '',
    organizationTag: '',
    appUrl: window.location.origin,
    enableMFA: true,
  });

  const updateFormData = (field: keyof ClientOnboardingRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.organizationName && formData.organizationName.length >= 3);
      case 2:
        return !!(
          formData.supportEmail &&
          formData.supportFirstName &&
          formData.supportLastName &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supportEmail)
        );
      case 3:
        return !!(formData.tailnet && formData.tailscaleApiKey);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly.',
        variant: 'destructive',
      });
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast({
        title: 'Validation Error',
        description: 'Please review all fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await onboardNewClient(formData as ClientOnboardingRequest);
      setResult(result);

      if (result.success) {
        toast({
          title: 'Success!',
          description: `Client ${formData.organizationName} has been onboarded successfully.`,
        });
        
        if (onComplete) {
          setTimeout(onComplete, 3000);
        }
      } else {
        toast({
          title: 'Onboarding Completed with Warnings',
          description: 'Some steps failed. Please review the details.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to onboard client',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    if (result) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-center py-8">
            {result.success ? (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            ) : (
              <AlertCircle className="h-16 w-16 text-yellow-500" />
            )}
          </div>
          
          <Alert className={result.success ? 'border-green-500' : 'border-yellow-500'}>
            <AlertDescription>
              {result.success ? (
                <div>
                  <p className="font-semibold mb-2">Client onboarding completed successfully!</p>
                  <ul className="space-y-1 text-sm">
                    <li>• Organization ID: {result.organizationId}</li>
                    <li>• Zitadel Project ID: {result.zitadelProjectId}</li>
                    <li>• Client ID: {result.zitadelClientId}</li>
                    <li>• Support User ID: {result.zitadelUserId}</li>
                    <li>• Invitation sent to: {formData.supportEmail}</li>
                  </ul>
                </div>
              ) : (
                <div>
                  <p className="font-semibold mb-2">Onboarding completed with warnings:</p>
                  <ul className="space-y-1 text-sm">
                    {result.errors?.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>

          {result.invitationToken && (
            <Alert>
              <AlertDescription>
                <p className="font-semibold mb-2">Invitation Token (for testing):</p>
                <code className="block p-2 bg-gray-100 rounded text-xs break-all">
                  {result.invitationToken}
                </code>
              </AlertDescription>
            </Alert>
          )}
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name *</Label>
              <Input
                id="orgName"
                placeholder="e.g., Acme Corporation"
                value={formData.organizationName}
                onChange={(e) => updateFormData('organizationName', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="orgLogo">Organization Logo URL (optional)</Label>
              <Input
                id="orgLogo"
                placeholder="https://example.com/logo.png"
                value={formData.organizationLogo}
                onChange={(e) => updateFormData('organizationLogo', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appUrl">Application URL *</Label>
              <Input
                id="appUrl"
                placeholder="https://portal.example.com"
                value={formData.appUrl}
                onChange={(e) => updateFormData('appUrl', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                The URL where the client portal will be accessible
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                The support user will be created with admin privileges and will receive 
                an invitation email to complete their registration.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={formData.supportFirstName}
                onChange={(e) => updateFormData('supportFirstName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={formData.supportLastName}
                onChange={(e) => updateFormData('supportLastName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                value={formData.supportEmail}
                onChange={(e) => updateFormData('supportEmail', e.target.value)}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Configure Tailscale for secure device enrollment and network access. 
                You'll need a Tailscale API key with appropriate permissions.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="tailnet">Tailnet Name *</Label>
              <Input
                id="tailnet"
                placeholder="example.tailnet.ts.net"
                value={formData.tailnet}
                onChange={(e) => updateFormData('tailnet', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">Tailscale API Key *</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="tskey-api-..."
                value={formData.tailscaleApiKey}
                onChange={(e) => updateFormData('tailscaleApiKey', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                This key will be encrypted and stored securely
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgTag">Organization Tag (optional)</Label>
              <Input
                id="orgTag"
                placeholder="auto-generated from organization name"
                value={formData.organizationTag}
                onChange={(e) => updateFormData('organizationTag', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Used for ACL rules and device tagging
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Please review the information below. Once you proceed, the following actions will be performed:
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Building2 className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Organization</p>
                  <p className="text-sm text-muted-foreground">{formData.organizationName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <User className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Support Administrator</p>
                  <p className="text-sm text-muted-foreground">
                    {formData.supportFirstName} {formData.supportLastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{formData.supportEmail}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Key className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Tailscale Integration</p>
                  <p className="text-sm text-muted-foreground">{formData.tailnet}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Actions to be performed:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mt-1">
                    <li>Create Zitadel project and OIDC application</li>
                    <li>Set up Tailscale integration with encrypted API key</li>
                    <li>Generate secure invitation token</li>
                    <li>Send invitation email to support user</li>
                    <li>Configure ACLs and access policies</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Client Onboarding Wizard</CardTitle>
        <CardDescription>
          Complete the following steps to onboard a new client organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress Steps */}
        {!result && (
          <div className="mb-8">
            <div className="flex justify-between">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex-1">
                  <div className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border-2 
                        ${currentStep >= step.id 
                          ? 'border-primary bg-primary text-white' 
                          : 'border-gray-300 text-gray-400'
                        }`}
                    >
                      {currentStep > step.id ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        step.id
                      )}
                    </div>
                    {idx < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 
                          ${currentStep > step.id ? 'bg-primary' : 'bg-gray-300'}
                        `}
                      />
                    )}
                  </div>
                  <div className="mt-2">
                    <p className={`text-sm font-medium ${currentStep >= step.id ? 'text-primary' : 'text-gray-400'}`}>
                      {step.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        {!result && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
            >
              Back
            </Button>
            
            {currentStep < steps.length ? (
              <Button onClick={handleNext} disabled={isLoading}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Onboarding...
                  </>
                ) : (
                  'Complete Onboarding'
                )}
              </Button>
            )}
          </div>
        )}

        {result && (
          <div className="flex justify-end mt-6">
            <Button onClick={onComplete}>
              Done
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
