import { supabase, type AuditEntry } from './supabase';

export async function logAction(action: string, detail: string = '') {
  const { error } = await supabase.from('audit_log').insert({ action, detail });
  if (error) console.warn('audit log failed', error.message);
  return null as AuditEntry | null;
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function formatTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return `${formatDate(iso)} • ${formatTime(iso)}`;
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dateKey(iso: string): string {
  return iso.slice(0, 10);
}
