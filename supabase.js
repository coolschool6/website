// Initialize Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://anuggwabtisuobsvmccg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFudWdnd2FidGlzdW9ic3ZtY2NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MDU3MTUsImV4cCI6MjA3NzA4MTcxNX0.EsHk2TDwz6knBzK9dIYpuRXAMvwzaLD81dcVy-h3ZxI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth functions
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
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    cb(event, session);
  });
  return subscription;
}

// Helper for getting current user
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

// Todo functions
export async function getTodos() {
  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function addTodo(task, description, category, priority, dueDate) {
  const { data, error } = await supabase
    .from('todos')
    .insert([
      { 
        task, 
        description, 
        category, 
        priority: parseInt(priority), 
        due_date: dueDate || null 
      }
    ])
    .select();
  
  if (error) throw error;
  return data[0];
}

export async function updateTodo(id, updates) {
  const { data, error } = await supabase
    .from('todos')
    .update(updates)
    .eq('id', id)
    .select();
  
  if (error) throw error;
  return data[0];
}

export async function deleteTodo(id) {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}