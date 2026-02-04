import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isSupabaseConfigured || !supabase) {
            setLoading(false);
            return;
        }

        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        if (!isSupabaseConfigured || !supabase) {
            alert('Supabase is not configured. Please check your environment variables.');
            return;
        }
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) {
            console.error('Error logging in with Google:', error.message);
            if (error.message.includes('Feature is disabled')) {
                alert(`Authentication Error: The Google provider is currently disabled.\n\nPlease enable Google in your Supabase Dashboard (Authentication -> Providers -> Google).`);
            } else if (error.message.includes('unexpected_failure')) {
                alert(`Authentication Error: Supabase encountered an unexpected failure.\n\nThis usually points to a database trigger error or configuration issue. Please check your Supabase Project Logs for details.`);
            } else {
                alert(`Error logging in with Google: ${error.message}\nPlease ensure Google Provider is enabled in your Supabase Dashboard.`);
            }
        }
    };

    const signOut = async () => {
        if (!isSupabaseConfigured || !supabase) return;
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, signInWithGoogle, signOut, loading }}>
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
