import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  roles: string[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*, organizations(*)')
              .eq('id', session.user.id)
              .single();
            setProfile(profileData);
            
            const { data: rolesData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id);
            setRoles(rolesData?.map(r => r.role) || []);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        Promise.all([
          supabase
            .from('profiles')
            .select('*, organizations(*)')
            .eq('id', session.user.id)
            .single(),
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
        ]).then(([profileRes, rolesRes]) => {
          setProfile(profileRes.data);
          setRoles(rolesRes.data?.map(r => r.role) || []);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    navigate('/auth');
  };

  const hasRole = (role: string) => {
    return roles.includes(role);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, loading, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};