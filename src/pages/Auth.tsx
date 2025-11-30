import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Shield, Lock, Mail, User, ArrowRight, Fingerprint } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const authSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validation = authSchema.safeParse({
        email,
        password,
        fullName: !isLogin ? fullName : undefined,
      });

      if (!validation.success) {
        toast({
          title: 'Validation Error',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Account created successfully!',
        });
        
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(210_100%_52%/0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(199_89%_48%/0.1),transparent_50%)]" />
        
        <div className="relative z-10 flex flex-col justify-center p-12 max-w-xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow-md">
              <span className="text-primary-foreground font-bold text-2xl">N</span>
            </div>
            <div>
              <h1 className="font-bold text-2xl text-foreground">Neogenesys</h1>
              <p className="text-sm text-muted-foreground">Zero Trust Access Platform</p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-8">
            <h2 className="text-3xl font-semibold leading-tight">
              Secure access to your<br />
              <span className="text-gradient">enterprise resources</span>
            </h2>
            
            <div className="space-y-4">
              {[
                { icon: Shield, text: 'Zero Trust security model' },
                { icon: Fingerprint, text: 'Multi-factor authentication' },
                { icon: Lock, text: 'End-to-end encryption' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-foreground">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-12">
            <p className="text-sm text-muted-foreground">
              Protected by enterprise-grade security
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">N</span>
            </div>
            <div>
              <h1 className="font-bold text-xl text-foreground">Neogenesys</h1>
            </div>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-semibold">
                {isLogin ? 'Welcome back' : 'Create account'}
              </CardTitle>
              <CardDescription>
                {isLogin 
                  ? 'Enter your credentials to access your portal' 
                  : 'Sign up to get started with Neogenesys'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required={!isLogin}
                        className="pl-10 bg-secondary/50 border-border/50"
                      />
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 bg-secondary/50 border-border/50"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 bg-secondary/50 border-border/50"
                    />
                  </div>
                </div>

                {isLogin && (
                  <div className="flex justify-end">
                    <Button variant="link" className="px-0 text-sm text-muted-foreground hover:text-primary">
                      Forgot password?
                    </Button>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full gap-2 gradient-primary hover:opacity-90 transition-opacity" 
                  disabled={loading}
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <>
                      {isLogin ? 'Sign In' : 'Create Account'}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsLogin(!isLogin)}
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            By continuing, you agree to our{' '}
            <a href="#" className="text-primary hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-primary hover:underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}