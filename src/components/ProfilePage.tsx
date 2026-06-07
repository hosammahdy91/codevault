import { useState, useEffect } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { getProfile, upsertProfile, getMyProjects, type Profile, type Project } from '../lib/supabase'

export function ProfilePage({ onBack }: { onBack: () => void }) {
  const { account } = useWallet()
  const wallet = account?.address.toString() ?? ''
  const [profile, setProfile] = useState<Profile>({ wallet_address: wallet })
  const [projects, setProjects] = useState<Project[]>([])
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!wallet) return
    Promise.all([getProfile(wallet), getMyProjects(wallet)]).then(([p, projs]) => {
      if (p) { setProfile(p); setUsername(p.username ?? ''); setBio(p.bio ?? '') }
      setProjects(projs); setLoading(false)
    })
  }, [wallet])

  async function saveProfile() {
    setSaving(true)
    await upsertProfile({ wallet_address: wallet, username, bio })
    setProfile(prev => ({ ...prev, username, bio }))
    setEditing(false); setSaving(false)
  }

  const shortAddr = (a: string) => a.slice(0, 8) + '...' + a.slice(-6)
  if (loading) return <div className="profile-loading">Loading profile...</div>

  return (
    <div className="profile-page">
      <button className="btn btn-outline back-btn" onClick={onBack}>Back</button>
      <div className="profile-card">
        <div className="profile-avatar">{(profile.username ?? wallet).slice(0, 2).toUpperCase()}</div>
        <div className="profile-info">
          {editing ? (
            <div className="profile-edit">
              <input className="field-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
              <textarea className="field-textarea" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself..." style={{minHeight:'80px'}} />
              <div style={{display:'flex',gap:'8px'}}>
                <button className="btn btn-acid" onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="profile-name">{profile.username ?? 'Anonymous'}</div>
              <div className="profile-wallet">{shortAddr(wallet)}</div>
              <div className="profile-bio">{profile.bio ?? 'No bio yet.'}</div>
              <button className="btn btn-outline" style={{marginTop:'10px'}} onClick={() => setEditing(true)}>Edit Profile</button>
            </>
          )}
        </div>
      </div>
      <div className="profile-stats">
        {[{val:projects.length,lbl:'Projects'},{val:projects.reduce((a,p)=>a+(p.views??0),0),lbl:'Views'},{val:projects.reduce((a,p)=>a+(p.likes??0),0),lbl:'Likes'}].map(s => (
          <div key={s.lbl} className="stat-block"><span className="stat-val">{s.val}</span><span className="stat-lbl">{s.lbl}</span></div>
        ))}
      </div>
      <div className="profile-projects">
        <div className="section-title">My Projects</div>
        {projects.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📭</div><div className="empty-title">No projects yet</div></div>
        ) : projects.map(p => (
          <div key={p.id} className="project-row">
            <div className={'card-lang-icon lang-'+(p.lang??'other')} style={{width:'32px',height:'32px',fontSize:'9px'}}>{(p.lang??'other').slice(0,2).toUpperCase()}</div>
            <div style={{flex:1}}><div className="card-filename">{p.name}</div><div className="card-desc">{p.description}</div></div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--snow4)'}}>{p.size} · {p.created_at?.slice(0,10)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
