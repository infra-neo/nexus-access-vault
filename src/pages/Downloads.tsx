import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Monitor, 
  Apple, 
  Terminal,
  Shield,
  CheckCircle2,
  FileCode,
  HardDrive,
  Info
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

interface DownloadItem {
  id: string;
  name: string;
  version: string;
  platform: 'windows' | 'macos' | 'linux';
  size: string;
  description: string;
  requirements: string[];
  downloadUrl: string;
}

export default function Downloads() {
  const downloads: DownloadItem[] = [
    {
      id: 'win-client',
      name: 'Neogenesys Client',
      version: '2.4.1',
      platform: 'windows',
      size: '45.2 MB',
      description: 'Full-featured desktop client for Windows with secure tunnel support.',
      requirements: ['Windows 10/11', '64-bit processor', '4GB RAM minimum'],
      downloadUrl: '#',
    },
    {
      id: 'mac-client',
      name: 'Neogenesys Client',
      version: '2.4.1',
      platform: 'macos',
      size: '52.8 MB',
      description: 'Native macOS application with M1/M2 silicon support.',
      requirements: ['macOS 12+', 'Apple Silicon or Intel', '4GB RAM minimum'],
      downloadUrl: '#',
    },
    {
      id: 'linux-client',
      name: 'Neogenesys Client',
      version: '2.4.0',
      platform: 'linux',
      size: '38.5 MB',
      description: 'Linux client supporting major distributions.',
      requirements: ['Ubuntu 20.04+', 'Debian 11+', 'RHEL 8+', 'Fedora 36+'],
      downloadUrl: '#',
    },
  ];

  const getPlatformIcon = (platform: DownloadItem['platform']) => {
    switch (platform) {
      case 'windows':
        return Monitor;
      case 'macos':
        return Apple;
      case 'linux':
        return Terminal;
    }
  };

  const getPlatformName = (platform: DownloadItem['platform']) => {
    switch (platform) {
      case 'windows':
        return 'Windows';
      case 'macos':
        return 'macOS';
      case 'linux':
        return 'Linux';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Downloads</h1>
        <p className="text-muted-foreground mt-1">
          Download the Neogenesys client for secure access
        </p>
      </div>

      {/* Security Notice */}
      <Alert className="border-primary/30 bg-primary/5">
        <Shield className="h-4 w-4 text-primary" />
        <AlertTitle>Secure Downloads</AlertTitle>
        <AlertDescription>
          All downloads are signed and verified. The client establishes encrypted tunnels 
          for Zero Trust access to your organization's resources.
        </AlertDescription>
      </Alert>

      {/* Platform Tabs */}
      <Tabs defaultValue="windows" className="space-y-6">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="windows" className="gap-2">
            <Monitor className="h-4 w-4" />
            Windows
          </TabsTrigger>
          <TabsTrigger value="macos" className="gap-2">
            <Apple className="h-4 w-4" />
            macOS
          </TabsTrigger>
          <TabsTrigger value="linux" className="gap-2">
            <Terminal className="h-4 w-4" />
            Linux
          </TabsTrigger>
        </TabsList>

        {downloads.map((item) => (
          <TabsContent key={item.id} value={item.platform}>
            <Card className="portal-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      {(() => {
                        const Icon = getPlatformIcon(item.platform);
                        return <Icon className="h-7 w-7 text-primary" />;
                      })()}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{item.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{getPlatformName(item.platform)}</Badge>
                        <Badge variant="outline">v{item.version}</Badge>
                        <span className="text-sm text-muted-foreground">{item.size}</span>
                      </div>
                    </div>
                  </div>
                  <Button className="gap-2 glow-primary">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">{item.description}</p>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Requirements */}
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      System Requirements
                    </h4>
                    <ul className="space-y-2">
                      {item.requirements.map((req, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Features */}
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-muted-foreground" />
                      Features
                    </h4>
                    <ul className="space-y-2">
                      {[
                        'Encrypted tunnel connection',
                        'Auto-enrollment support',
                        'MFA integration',
                        'Session management',
                      ].map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Additional Downloads */}
      <div>
        <h2 className="text-lg font-medium mb-4">Additional Resources</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { name: 'Configuration Profile', desc: 'Auto-configure client settings', size: '2 KB' },
            { name: 'Root Certificates', desc: 'Trust certificates for validation', size: '4 KB' },
            { name: 'CLI Tools', desc: 'Command-line utilities', size: '12 MB' },
          ].map((item, i) => (
            <Card key={i} className="portal-card card-hover">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                    <FileCode className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <Card className="portal-card">
        <CardContent className="flex items-center gap-4 py-4">
          <Info className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm">
              Need help with installation? Check our{' '}
              <a href="#" className="text-primary hover:underline">documentation</a>
              {' '}or contact{' '}
              <a href="#" className="text-primary hover:underline">support</a>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}