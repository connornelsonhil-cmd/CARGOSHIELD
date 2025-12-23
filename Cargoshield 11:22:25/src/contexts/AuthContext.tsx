import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, UserProfile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string, retries = 3) => {
    try {
      console.log('🔍 loadUserProfile called with userId:', userId);
      
      // Try to fetch the profile with retry logic
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          console.log(`📊 Attempt ${attempt}/${retries}: Querying profiles table for id:`, userId);
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          console.log(`📊 Query result - data:`, data, 'error:', error);

          if (error) {
            console.log(`⚠️ Query error on attempt ${attempt}:`, error);
            lastError = error;
            // Wait a bit before retrying
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 500 * attempt));
              continue;
            }
            throw error;
          }

          // Success! Set the profile
          if (data) {
            console.log('✅ Profile loaded successfully:', data);
            setProfile(data);
          } else {
            console.log('⚠️ No profile found for user, setting to null');
            setProfile(null);
          }
          break; // Exit retry loop on success
        } catch (attemptError) {
          lastError = attemptError as Error;
          if (attempt === retries) {
            throw lastError;
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
      }
    } catch (error) {
      console.log('💥 Catch block - error:', error);
      console.error('Error loading user profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
