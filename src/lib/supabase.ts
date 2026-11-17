import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined);

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined);

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey.length > 10
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export interface DbHealthStatus {
  configured: boolean;
  connected: boolean;
  error?: string;
}

export async function checkDatabaseConnection(): Promise<DbHealthStatus> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      configured: false,
      connected: false,
      error:
        'Variablat e mjedisit (VITE_SUPABASE_URL dhe VITE_SUPABASE_ANON_KEY) nuk janë konfiguruar në Vercel.',
    };
  }

  try {
    const { error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (error) {
      return {
        configured: true,
        connected: false,
        error: `Gabim nga baza e të dhënave: ${error.message}`,
      };
    }

    return {
      configured: true,
      connected: true,
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      error:
        err instanceof Error
          ? err.message
          : 'Nuk u arrit lidhja me serverin e Supabase.',
    };
  }
}
