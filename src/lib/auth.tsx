import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Doctor } from './supabase';

interface AuthState {
  ready: boolean;
  session: Session | null;
  doctor: Doctor | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (fullName: string, department: string, email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadDoctor(sess: Session | null) {
    if (!sess) {
      setDoctor(null);
      return;
    }
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', sess.user.id)
      .maybeSingle();
    if (error) {
      setDoctor(null);
      return;
    }
    setDoctor(data as Doctor | null);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
        await loadDoctor(data.session);
      } catch {
        if (mounted) setSession(null);
      } finally {
        if (mounted) setReady(true);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      (async () => {
        await loadDoctor(sess);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? translateError(error.message) : null };
    } finally {
      setLoading(false);
    }
  }

  async function signUp(fullName: string, department: string, email: string, password: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: translateError(error.message) };
      if (data.user) {
        const { error: profileErr } = await supabase
          .from('doctors')
          .insert({ id: data.user.id, full_name: fullName, department });
        if (profileErr) return { error: 'تعذّر إنشاء ملف الدكتور: ' + profileErr.message };
      }
      return { error: null };
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setDoctor(null);
  }

  async function refresh() {
    await loadDoctor(session);
  }

  return (
    <AuthContext.Provider value={{ ready, session, doctor, loading, signIn, signUp, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (m.includes('user already registered')) return 'هذا البريد مسجّل مسبقًا.';
  if (m.includes('password should be at least')) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
  if (m.includes('unable to validate email')) return 'صيغة البريد الإلكتروني غير صحيحة.';
  if (m.includes('email rate limit exceeded') || m.includes('rate limit exceeded')) {
    return 'تم تجاوز حد إرسال رسائل البريد الإلكتروني. انتظر قليلًا ثم حاول مرة أخرى، أو سجّل الدخول إذا كان الحساب موجودًا.';
  }
  return msg;
}
