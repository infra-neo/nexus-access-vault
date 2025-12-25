import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

type CallbackStatus = 'processing' | 'success' | 'error';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          throw new Error(errorDescription || error);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state');
        }

        // Get stored SSO state from sessionStorage
        const storedState = sessionStorage.getItem('zitadel_state');
        const configId = sessionStorage.getItem('zitadel_config_id');
        const codeVerifier = sessionStorage.getItem('zitadel_code_verifier');

        if (storedState !== state) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }

        if (!configId) {
          throw new Error('Missing Zitadel configuration');
        }

        setMessage('Exchanging authorization code...');

        // Exchange code for tokens and get user info via edge function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zitadel-api?action=sso-callback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              configId,
              code,
              codeVerifier,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok || result.error) {
          throw new Error(result.error || 'Failed to process SSO callback');
        }

        setMessage('Signing in...');

        // Sign in with the generated credentials
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: result.email,
          password: result.tempPassword,
        });

        if (signInError) {
          throw signInError;
        }

        // Clean up session storage
        sessionStorage.removeItem('zitadel_state');
        sessionStorage.removeItem('zitadel_config_id');
        sessionStorage.removeItem('zitadel_code_verifier');
        sessionStorage.removeItem('zitadel_nonce');

        setStatus('success');
        setMessage('Authentication successful!');

        toast({
          title: 'Welcome!',
          description: `Signed in as ${result.userInfo?.name || result.email}`,
        });

        // Redirect to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);

      } catch (error: any) {
        console.error('SSO callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Authentication failed');
        
        toast({
          title: 'Authentication Failed',
          description: error.message || 'An error occurred during SSO login',
          variant: 'destructive',
        });

        // Redirect to auth page after showing error
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      <div className="text-center space-y-6 p-8">
        {status === 'processing' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
            <h2 className="text-2xl font-semibold text-white">{message}</h2>
            <p className="text-muted-foreground">Please wait while we complete your login...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-semibold text-white">{message}</h2>
            <p className="text-muted-foreground">Redirecting to dashboard...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-2xl font-semibold text-white">Authentication Error</h2>
            <p className="text-destructive">{message}</p>
            <p className="text-muted-foreground">Redirecting to login page...</p>
          </>
        )}
      </div>
    </div>
  );
}
