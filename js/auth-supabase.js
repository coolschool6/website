// Supabase Auth helpers — signUp, signIn, signOut, and auth state listener
import { supabase } from './supabase.js';

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthChange(cb) {
  // supabase.auth.onAuthStateChange -> updated API (v2): auth.onAuthStateChange
  const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
    cb(event, session);
  });
  return () => listener?.subscription?.unsubscribe?.();
}