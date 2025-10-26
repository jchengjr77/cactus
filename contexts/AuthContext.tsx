import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { registerForPushNotificationsAsync, savePushToken, removePushToken } from '@/lib/pushNotifications';
import { User as DbUser } from '@/types/database';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Register for push notifications if user is logged in
      if (session?.user) {
        await registerPushNotification(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Register for push notifications on sign in
      if (_event === 'SIGNED_IN' && session?.user) {
        await registerPushNotification(session.user.id);
      }
      // Remove push token on sign out
      else if (_event === 'SIGNED_OUT') {
        // Token removal handled in signOut function
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const registerPushNotification = async (authUserId: string) => {
    try {
      // Get the database user ID from the auth UUID
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('uuid', authUserId)
        .single();

      if (dbUser) {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await savePushToken(dbUser.id, pushToken);
        }
      }
    } catch (error) {
      console.error('Error registering push notification:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    // Create user profile in users table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            uuid: data.user.id,
            email: email,
            name: name,
          },
        ]);

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        return { error: profileError };
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    // Remove push token before signing out
    if (user) {
      try {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id')
          .eq('uuid', user.id)
          .single();

        if (dbUser) {
          await removePushToken(dbUser.id);
        }
      } catch (error) {
        console.error('Error removing push token:', error);
      }
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
