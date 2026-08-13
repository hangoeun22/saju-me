import { READING_SELECT, USER_SELECT } from './constants'
import { supabase } from './supabase'

export async function fetchProfile(userId) {
  return supabase.from('users').select(USER_SELECT).eq('id', userId).maybeSingle()
}

export async function upsertProfile(userId, payload) {
  return supabase
    .from('users')
    .upsert({ id: userId, ...payload }, { onConflict: 'id' })
    .select(USER_SELECT)
    .single()
}

export async function fetchReadings(userId) {
  return supabase
    .from('saju_readings')
    .select(READING_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
}

export async function insertReading(payload) {
  return supabase.from('saju_readings').insert(payload).select(READING_SELECT).single()
}

export async function updateReading(id, payload) {
  return supabase.from('saju_readings').update(payload).eq('id', id).select(READING_SELECT).single()
}

export async function deleteReading(id) {
  return supabase.from('saju_readings').delete().eq('id', id)
}

export async function fetchReadingCount() {
  return supabase.rpc('saju_reading_count')
}

export async function fetchSharedReading(readingId) {
  return supabase.rpc('get_shared_saju', { p_id: readingId })
}
