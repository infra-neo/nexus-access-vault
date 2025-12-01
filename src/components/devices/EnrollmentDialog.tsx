import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  Fingerprint, 
  Loader2, 
  Copy, 
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useDeviceEnrollment } from '@/hooks/useDeviceEnrollment';
import { toast } from 'sonner';

interface EnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnrollmentComplete: () => void;
}

export function EnrollmentDialog({ 
  open, 
  onOpenChange, 
  onEnrollmentComplete 
}: EnrollmentDialogProps) {
  const [deviceName, setDeviceName] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  
  const {
    deviceInfo,
    isEnrolling,
    enrollmentToken,
    enrollmentExpiry,
    error,
    silentEnroll,
    generateQRToken,
    verifyEnrollment,
    clearToken,
  } = useDeviceEnrollment();

  // Countdown timer
  useEffect(() => {
    if (!enrollmentExpiry) {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((enrollmentExpiry.getTime() - Date.now()) / 1000));
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        clearToken();
        toast.error('Enrollment token expired');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [enrollmentExpiry, clearToken]);

  const handleSilentEnroll = async () => {
    const result = await silentEnroll();
    if (result?.success) {
      toast.success('Device enrolled successfully');
      onEnrollmentComplete();
      onOpenChange(false);
    }
  };

  const handleGenerateQR = async () => {
    await generateQRToken(deviceName || 'New Device');
  };

  const handleVerify = async () => {
    if (!verifyToken.trim()) {
      toast.error('Please enter the enrollment token');
      return;
    }
    
    const result = await verifyEnrollment(verifyToken, deviceName);
    if (result?.success) {
      toast.success('Device verified and enrolled');
      onEnrollmentComplete();
      onOpenChange(false);
    }
  };

  const copyToken = () => {
    if (enrollmentToken) {
      navigator.clipboard.writeText(enrollmentToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Token copied to clipboard');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const qrValue = enrollmentToken 
    ? JSON.stringify({
        token: enrollmentToken,
        url: `${window.location.origin}/enroll?token=${enrollmentToken}`
      })
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            Enroll New Device
          </DialogTitle>
          <DialogDescription>
            Add a new trusted device to your account using QR code or silent enrollment.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="qr" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr" className="gap-2">
              <QrCode className="h-4 w-4" />
              QR Code
            </TabsTrigger>
            <TabsTrigger value="silent" className="gap-2">
              <Fingerprint className="h-4 w-4" />
              This Device
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name (Optional)</Label>
              <Input
                id="device-name"
                placeholder="e.g., Work Laptop, Personal Phone"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </div>

            {!enrollmentToken ? (
              <Button 
                onClick={handleGenerateQR} 
                disabled={isEnrolling}
                className="w-full"
              >
                {isEnrolling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR Code
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center p-6 bg-white rounded-lg">
                  <QRCodeSVG 
                    value={qrValue}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Expires in:
                    </span>
                    <Badge variant={timeRemaining && timeRemaining < 60 ? 'destructive' : 'secondary'}>
                      {timeRemaining !== null ? formatTime(timeRemaining) : '--:--'}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={copyToken}>
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  Scan this QR code with the Neogenesys client app on the device you want to enroll.
                </p>

                <Button 
                  variant="outline" 
                  onClick={handleGenerateQR}
                  className="w-full"
                >
                  Generate New Code
                </Button>
              </div>
            )}

            <div className="border-t border-border pt-4 mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Already have an enrollment token?
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter enrollment token"
                  value={verifyToken}
                  onChange={(e) => setVerifyToken(e.target.value)}
                />
                <Button onClick={handleVerify} disabled={isEnrolling}>
                  Verify
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="silent" className="space-y-4 mt-4">
            <div className="p-4 bg-muted/30 rounded-lg space-y-3">
              <h4 className="font-medium">Detected Device Info</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Type:</div>
                <div className="capitalize">{deviceInfo.type}</div>
                <div className="text-muted-foreground">OS:</div>
                <div>{deviceInfo.os}</div>
                <div className="text-muted-foreground">Name:</div>
                <div>{deviceInfo.name}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-name">Custom Device Name (Optional)</Label>
              <Input
                id="custom-name"
                placeholder={deviceInfo.name}
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleSilentEnroll} 
              disabled={isEnrolling}
              className="w-full"
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enrolling...
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Enroll This Device
                </>
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              This will register your current browser/device as a trusted device.
            </p>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg mt-4">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
