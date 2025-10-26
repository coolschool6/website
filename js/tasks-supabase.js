// Tasks CRUD + realtime subscription using Supabase
import { supabase } from './supabase.js';

/* Fetch tasks for current user */
export async function fetchTasks({ filter = {}, sort = 'created_desc' } = {}) {
  let q = supabase
    .from('tasks')
    .select('*, categories:category_id(name,color)')
    .order('order', { ascending: true });

  // apply filters
  if (filter.status === 'active') q = q.filter('completed', 'eq', false);
  if (filter.status === 'completed') q = q.filter('completed', 'eq', true);
  if (filter.category && filter.category !== 'all') q = q.filter('category_id', 'eq', filter.category);

  // sorting override
  switch (sort) {
    case 'created_desc':
      q = q.order('created_at', { ascending: false }); break;
    case 'created_asc':
      q = q.order('created_at', { ascending: true }); break;
    case 'due_asc':
      q = q.order('due_at', { ascending: true }).order('created_at', { ascending: true }); break;
    case 'due_desc':
      q = q.order('due_at', { ascending: false }); break;
    default:
      q = q.order('order', { ascending: true }); break;
  }

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createTask(task) {
  // task: { title, description, category_id, priority, due_at, reminder }
  const { data, error } = await supabase.from('tasks').insert([task]).select().single();
  if (error) throw error;
  return data;
}

export async function updateTask(id, updates) {
  const { data, error } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function reorderTasks(orderedIds) {
  // orderedIds: array of task ids in desired order
  // We'll update tasks in a single request using upsert and order values
  const updates = orderedIds.map((id, idx) => ({ id, order: idx + 1 }));
  const { data, error } = await supabase.from('tasks').upsert(updates);
  if (error) throw error;
  return data;
}

/* Realtime subscription to tasks for current user */
export function subscribeToTasks(onChange) {
  const subscription = supabase
    .channel('public:tasks')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: 'user_id=eq.' + supabase.auth.getUser().then(r=>r?.data?.user?.id || 'unknown') },
      payload => onChange(payload)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}