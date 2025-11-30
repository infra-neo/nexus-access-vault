import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Monitor, 
  Terminal, 
  Globe, 
  Clock, 
  MapPin,
  Wifi,
  WifiOff,
  X,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Session {
  id: string;
  resourceName: string;
  resourceType: string;
  startTime: string;
  duration: string;
  status: 'active' | 'idle' | 'disconnected';
  device: string;
  location: string;
  ipAddress: string;
}

export default function Sessions() {
  const [showTerminateAll, setShowTerminateAll] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Demo sessions
  const sessions: Session[] = [
    {
      id: '1',
      resourceName: 'Production Server',
      resourceType: 'rdp',
      startTime: new Date(Date.now() - 3600000 * 2.5).toISOString(),
      duration: '2h 30m',
      status: 'active',
      device: 'MacBook Pro',
      location: 'Mexico City, MX',
      ipAddress: '192.168.1.100',
    },
    {
      id: '2',
      resourceName: 'Development VM',
      resourceType: 'ssh',
      startTime: new Date(Date.now() - 3600000 * 1).toISOString(),
      duration: '1h 05m',
      status: 'active',
      device: 'MacBook Pro',
      location: 'Mexico City, MX',
      ipAddress: '192.168.1.100',
    },
    {
      id: '3',
      resourceName: 'Analytics Dashboard',
      resourceType: 'web',
      startTime: new Date(Date.now() - 3600000 * 0.5).toISOString(),
      duration: '32m',
      status: 'idle',
      device: 'MacBook Pro',
      location: 'Mexico City, MX',
      ipAddress: '192.168.1.100',
    },
    {
      id: '4',
      resourceName: 'Database Admin',
      resourceType: 'ssh',
      startTime: new Date(Date.now() - 86400000).toISOString(),
      duration: '45m',
      status: 'disconnected',
      device: 'Windows Desktop',
      location: 'Mexico City, MX',
      ipAddress: '192.168.1.101',
    },
  ];

  const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'idle');

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'rdp':
        return Monitor;
      case 'ssh':
        return Terminal;
      default:
        return Globe;
    }
  };

  const getStatusBadge = (status: Session['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="badge-success">
            <Wifi className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'idle':
        return (
          <Badge variant="outline" className="badge-warning">
            <Clock className="h-3 w-3 mr-1" />
            Idle
          </Badge>
        );
      case 'disconnected':
        return (
          <Badge variant="outline" className="badge-error">
            <WifiOff className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Active Sessions</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage your active connections
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button 
            variant="destructive" 
            className="gap-2"
            onClick={() => setShowTerminateAll(true)}
            disabled={activeSessions.length === 0}
          >
            <X className="h-4 w-4" />
            End All Sessions
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Sessions
            </CardTitle>
            <Activity className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.filter(s => s.status === 'active').length}</div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Idle Sessions
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.filter(s => s.status === 'idle').length}</div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Duration
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4h 07m</div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Table */}
      <Card className="portal-card">
        <CardHeader>
          <CardTitle className="text-base">Session History</CardTitle>
          <CardDescription>Your recent and active sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => {
                const Icon = getResourceIcon(session.resourceType);
                return (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{session.resourceName}</p>
                          <p className="text-xs text-muted-foreground uppercase">
                            {session.resourceType}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{session.device}</p>
                      <p className="text-xs text-muted-foreground">{session.ipAddress}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{session.duration}</p>
                      <p className="text-xs text-muted-foreground">
                        Started {new Date(session.startTime).toLocaleTimeString()}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {session.location}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(session.status)}</TableCell>
                    <TableCell>
                      {session.status !== 'disconnected' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setSelectedSession(session)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Terminate All Dialog */}
      <AlertDialog open={showTerminateAll} onOpenChange={setShowTerminateAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              End All Sessions
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately terminate all {activeSessions.length} active sessions. 
              Any unsaved work may be lost. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => setShowTerminateAll(false)}
            >
              End All Sessions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Session Terminate Dialog */}
      <AlertDialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end the session for "{selectedSession?.resourceName}"? 
              Any unsaved work may be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => setSelectedSession(null)}
            >
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}