import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DeviceInfo {
  name: string;
  type: string;
  os: string;
  fingerprint: string;
}

interface EnrollmentResult {
  success: boolean;
  device_id?: string;
  enrollment_token?: string;
  expires_at?: string;
  status?: string;
  message?: string;
  error?: string;
}

function generateFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
  }
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    canvas.toDataURL(),
  ];
  
  // Simple hash function
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36) + '-' + Date.now().toString(36);
}

function detectDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  let os = 'Unknown';
  let type = 'laptop';
  
  if (/Windows/.test(ua)) {
    os = 'Windows ' + (/Windows NT 10/.test(ua) ? '10/11' : 'Unknown');
  } else if (/Mac/.test(ua)) {
    os = 'macOS';
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
  } else if (/Android/.test(ua)) {
    os = 'Android';
    type = 'mobile';
  } else if (/iPhone|iPad/.test(ua)) {
    os = 'iOS';
    type = /iPad/.test(ua) ? 'tablet' : 'mobile';
  }
  
  if (/Mobile/.test(ua) && type === 'laptop') {
    type = 'mobile';
  }
  
  return {
    name: `${os} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
    type,
    os,
    fingerprint: generateFingerprint(),
  };
}

export function useDeviceEnrollment() {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollmentToken, setEnrollmentToken] = useState<string | null>(null);
  const [enrollmentExpiry, setEnrollmentExpiry] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo] = useState<DeviceInfo>(detectDeviceInfo);

  // Silent enrollment on mount
  const silentEnroll = useCallback(async () => {
    setIsEnrolling(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke<EnrollmentResult>(
        'device-enrollment',
        {
          body: {
            action: 'enroll',
            device_name: deviceInfo.name,
            device_type: deviceInfo.type,
            os: deviceInfo.os,
            fingerprint: deviceInfo.fingerprint,
          },
        }
      );

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Enrollment failed');
      
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enroll device';
      setError(message);
      console.error('Silent enrollment error:', err);
      return null;
    } finally {
      setIsEnrolling(false);
    }
  }, [deviceInfo]);

  // Generate QR code token
  const generateQRToken = useCallback(async (deviceName?: string) => {
    setIsEnrolling(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke<EnrollmentResult>(
        'device-enrollment',
        {
          body: {
            action: 'generate_token',
            device_name: deviceName || 'New Device',
            device_type: deviceInfo.type,
            os: deviceInfo.os,
          },
        }
      );

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate token');
      
      setEnrollmentToken(data.enrollment_token || null);
      setEnrollmentExpiry(data.expires_at ? new Date(data.expires_at) : null);
      
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate enrollment token';
      setError(message);
      console.error('QR token generation error:', err);
      return null;
    } finally {
      setIsEnrolling(false);
    }
  }, [deviceInfo]);

  // Verify enrollment from another device
  const verifyEnrollment = useCallback(async (token: string, deviceName?: string) => {
    setIsEnrolling(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke<EnrollmentResult>(
        'device-enrollment',
        {
          body: {
            action: 'verify',
            enrollment_token: token,
            device_name: deviceName || deviceInfo.name,
            device_type: deviceInfo.type,
            os: deviceInfo.os,
            fingerprint: deviceInfo.fingerprint,
          },
        }
      );

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Verification failed');
      
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify enrollment';
      setError(message);
      console.error('Enrollment verification error:', err);
      return null;
    } finally {
      setIsEnrolling(false);
    }
  }, [deviceInfo]);

  const clearToken = useCallback(() => {
    setEnrollmentToken(null);
    setEnrollmentExpiry(null);
  }, []);

  return {
    deviceInfo,
    isEnrolling,
    enrollmentToken,
    enrollmentExpiry,
    error,
    silentEnroll,
    generateQRToken,
    verifyEnrollment,
    clearToken,
  };
}
