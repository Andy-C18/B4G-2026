import { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Patient, Doctor } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: (Patient | Doctor) | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, profileData: PatientSignUpData | DoctorSignUpData, role: 'patient' | 'doctor') => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface PatientSignUpData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  gender: string;
  age: number;
  password: string;
  medicalHistory?: Record<string, string>;
}

export interface DoctorSignUpData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  speciality: string;
  practiceName: string;
  gender: string;
  age: number;
  timeAvailable?: Record<string, unknown>;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<(Patient | Doctor) | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    // Try to fetch as patient
    let { data } = await supabase
      .from('patients')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data as Patient);
      return;
    }

    // If not patient, try as doctor
    const { data: doctorData } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', userId)
      .single();

    if (doctorData) {
      setProfile(doctorData as Doctor);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, _password: string) => {
    // DEMO MODE: Skip Supabase auth, create mock user
    const mockUser: User = {
      id: 'demo-user-' + Math.random().toString(36).substr(2, 9),
      email,
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'demo', providers: ['demo'] },
      user_metadata: { role: 'patient' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setUser(mockUser);

    // Create mock patient profile for demo
    const mockPatient: Patient = {
      id: mockUser.id,
      fullName: 'Demo User',
      email,
      phone: '555-1234',
      location: 'San Francisco, CA',
      gender: 'Not specified',
      age: 30,
      password: 'demo-password',
      medicalHistory: {},
      createdAt: new Date().toISOString(),
    };
    setProfile(mockPatient);
    setSession({
      user: mockUser,
      access_token: 'demo-token',
      refresh_token: 'demo-refresh',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
    } as unknown as Session);
  };

  const signUp = async (_email: string, _password: string, profileData: PatientSignUpData | DoctorSignUpData, role: 'patient' | 'doctor') => {
    // DEMO MODE: Skip Supabase auth, create mock user with profile data
    const mockUserId = 'demo-user-' + Math.random().toString(36).substr(2, 9);
    const mockUser: User = {
      id: mockUserId,
      email: profileData.email,
      email_confirmed_at: new Date().toISOString(),
      phone: profileData.phone,
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'demo', providers: ['demo'] },
      user_metadata: { role },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setUser(mockUser);

    // Create mock profile with the provided data
    const mockProfile = {
      id: mockUserId,
      ...profileData,
      createdAt: new Date().toISOString(),
    } as Patient | Doctor;

    setProfile(mockProfile);
    setSession({
      user: mockUser,
      access_token: 'demo-token',
      refresh_token: 'demo-refresh',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
    } as unknown as Session);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
