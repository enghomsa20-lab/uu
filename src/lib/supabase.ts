import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('Supabase env vars missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'hudour-auth',
  },
});

export type Grade = 1 | 2 | 3 | 4;
export type SessionStatus = 'draft' | 'active' | 'ended' | 'closed';

export interface Doctor {
  id: string;
  full_name: string;
  department: string;
  created_at: string;
}

export interface Student {
  id: string;
  doctor_id: string;
  name: string;
  code: string;
  grade: Grade;
  notes: string;
  created_at: string;
}

export interface Session {
  id: string;
  doctor_id: string;
  title: string;
  grade: Grade;
  wifi_ssid: string;
  wifi_password: string;
  require_code: boolean;
  qr_interval_sec: number;
  status: SessionStatus;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  doctor_id: string;
  student_id: string | null;
  student_name: string;
  student_code: string;
  recorded_at: string;
  manual: boolean;
  edit_reason: string;
  edited_at: string | null;
}

export interface AuditEntry {
  id: string;
  doctor_id: string;
  action: string;
  detail: string;
  created_at: string;
}

export const GRADE_LABELS: Record<Grade, string> = {
  1: 'الفرقة الأولى',
  2: 'الفرقة الثانية',
  3: 'الفرقة الثالثة',
  4: 'الفرقة الرابعة',
};

export const STATUS_LABELS: Record<SessionStatus, string> = {
  draft: 'مسودة',
  active: 'نشطة',
  ended: 'منتهية',
  closed: 'مغلقة',
};
