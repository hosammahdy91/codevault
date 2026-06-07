import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://iccqatsxvqffelivcigs.supabase.co'
const SUPABASE_KEY = 'sb_publishable_RUOEzjhTEmAqCZgp-Y8u_A_oI4iCcgT'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export interface Profile {
  id?: string
  wallet_address: string
  username?: string
  bio?: string
  avatar_url?: string
  created_at?: string
}

export interface Project {
  id?: string
  wallet_address: string
  name: string
  description?: string
  code_hash: string
  tags?: string[]
  size?: string
  lang?: string
  files_count?: number
  views?: number
  likes?: number
  created_at?: string
}

// ── PROFILES ──
export async function getProfile(wallet: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('wallet_address', wallet)
    .single()
  return data
}

export async function upsertProfile(profile: Profile): Promise<void> {
  await supabase.from('profiles').upsert(profile, { onConflict: 'wallet_address' })
}

// ── PROJECTS ──
export async function publishProject(project: Project): Promise<Project | null> {
  const { data } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single()
  return data
}

export async function getAllProjects(): Promise<Project[]> {
  const { data } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getMyProjects(wallet: string): Promise<Project[]> {
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('wallet_address', wallet)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function incrementViews(id: string): Promise<void> {
  await supabase.rpc('increment_views', { project_id: id })
}

// ── LIKES ──
export async function toggleLike(wallet: string, projectId: string): Promise<boolean> {
  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('wallet_address', wallet)
    .eq('project_id', projectId)
    .single()

  if (data) {
    await supabase.from('likes').delete()
      .eq('wallet_address', wallet)
      .eq('project_id', projectId)
    return false
  } else {
    await supabase.from('likes').insert({ wallet_address: wallet, project_id: projectId })
    return true
  }
}
