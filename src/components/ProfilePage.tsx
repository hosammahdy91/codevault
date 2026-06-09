import { useState, useEffect, useRef } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { getProfile, upsertProfile, getMyProjects, deleteProject, toggleFollow, isFollowing, type Profile, type Project } from '../lib/supabase'
import { supabase } from '../lib/supabase'

interface Props {
  onBack: () => void
  viewWallet?: string
}

export function ProfilePage({ onBack, viewWallet }: Props) {
  const { account } = useWallet()
  const myWallet  = account?.address.toString() ?? ''
  const wallet    = viewWallet ?? myWallet
  const isOwnProfile = wallet === myWallet

  const [profile, setProfile]     = useState<Profile>({ wallet_address: wallet })
  const [projects, setProjects]   = useState<Project[]>([])
  const [editing, setEditing]     = useState(false)
  const [username, setUsername]   = useState('')
  const [bio, setBio]             = useState('')
  const [saving, setSaving]       = useState(false)
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [following, setFollowing] = useState(false)
  const [fLoading, setFLoading]   = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!wallet) return
    Promise.all([
      getProfile(wallet),
      getMyProjects(wallet),
      myWallet && !isOwnProfile ? isFollowing(myWallet, wallet) : Promise.resolve(false)
    ]).then(([p, projs, isF]) => {
      if (p) { setProfile(p); setUsername(p.username ?? ''); setBio(p.bio ?? '') }
      setProjects(projs)
      setFollowing(isF as boolean)
      setLoading(false)
    })
  }, [wallet, myWallet, isOwnProfile])

  async function handleFollow() {
    if (!myWallet || isOwnProfile) return
    setFLoading(true)
    const nowFollowing = await toggleFollow(myWallet, wallet)
    setFollowing(nowFollowing)
    setProfile(prev => ({
      ...prev,
      followers_count: Math.max(0, (prev.followers_count ?? 0) + (nowFollowing ? 1 : -1))
    }))
    setFLoading(false)
  }

  async function uploadAvatar(file: File) {
    if (!myWallet) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = myWallet + '.' + ext
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const avatar_url = data.publicUrl + '?t=' + Date.now()
      await upsertProfile({ wallet_address: myWallet, avatar_url })
      setProfile(prev => ({ ...prev, avatar_url }))
    } catch (e) { console.error('Upload failed:', e) }
    setUploading(false)
  }

  async function saveProfile() {
    setSaving(true)
    await upsertProfile({ wallet_address: myWallet, username, bio })
    setProfile(prev => ({ ...prev, username, bio }))
    setEditing(false); setSaving(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm('Delete "' + name + '"? This cannot be undone.')) return
    await deleteProject(id)
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  const shortAddr = (a: string) => a.slice(0, 8) + '...' + a.slice(-6)
  if (loading) return <div className="profile-loading">Loading profile...</div>

  return (
    <div className="profile-page">
      <button className="btn btn-outline back-btn" onClick={onBack}>Back</button>

      <div className="profile-card">
        <div className="avatar-wrap" onClick={() => isOwnProfile && avatarRef.current?.click()}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="avatar" className="profile-avatar-img" />
            : <div className="profile-avatar">{(profile.username ?? wallet).slice(0,2).toUpperCase()}</div>
          }
          {isOwnProfile && <div className="avatar-overlay">{uploading ? '...' : '📷'}</div>}
          <input ref={avatarRef} type="file" accept="image/*" style={{display:'none'}}
            onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
        </div>

        <div className="profile-info" style={{flex:1}}>
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
              <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
                <div className="profile-name">{profile.username ?? 'Anonymous'}</div>
                {!isOwnProfile && myWallet && (
                  <button
                    className={'btn btn-sm ' + (following ? 'btn-outline' : 'btn-acid')}
                    onClick={handleFollow}
                    disabled={fLoading}
                    style={{fontSize:'12px',padding:'4px 14px'}}
                  >
                    {fLoading ? '...' : following ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>
              <div className="profile-wallet">{shortAddr(wallet)}</div>
              <div className="profile-bio">{profile.bio ?? 'No bio yet.'}</div>
              <div style={{display:'flex',gap:'16px',marginTop:'8px'}}>
                <span style={{fontSize:'12px',color:'var(--snow3)'}}>
                  <strong style={{color:'var(--snow)'}}>{profile.followers_count ?? 0}</strong> followers
                </span>
                <span style={{fontSize:'12px',color:'var(--snow3)'}}>
                  <strong style={{color:'var(--snow)'}}>{profile.following_count ?? 0}</strong> following
                </span>
              </div>
              {isOwnProfile && (
                <button className="btn btn-outline" style={{marginTop:'10px'}} onClick={() => setEditing(true)}>
                  Edit Profile
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="profile-stats">
        {[
          { val: projects.length, lbl: 'Projects' },
          { val: projects.reduce((a,p)=>a+(p.views??0),0), lbl: 'Views' },
          { val: projects.reduce((a,p)=>a+(p.stars??0),0), lbl: 'Stars' },
        ].map(s => (
          <div key={s.lbl} className="stat-block">
            <span className="stat-val">{s.val}</span>
            <span className="stat-lbl">{s.lbl}</span>
          </div>
        ))}
      </div>

      <div className="profile-projects">
        <div className="section-title">Projects</div>
        {projects.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📭</div><div className="empty-title">No projects yet</div></div>
        ) : projects.map(p => (
          <div key={p.id} className="project-row">
            <div className={'card-lang-icon lang-'+(p.lang??'other')} style={{width:'32px',height:'32px',fontSize:'9px'}}>
              {(p.lang??'other').slice(0,2).toUpperCase()}
            </div>
            <div style={{flex:1}}>
              <div className="card-filename">{p.name}</div>
              <div className="card-desc">{p.description}</div>
            </div>
            <div style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--snow4)'}}>
              {p.size} · {p.created_at?.slice(0,10)}
            </div>
            {isOwnProfile && (
              <button onClick={() => handleDelete(p.id!, p.name)}
                style={{background:'transparent',border:'1px solid rgba(255,77,106,0.2)',color:'var(--rose)',borderRadius:'6px',padding:'4px 10px',fontSize:'11px',cursor:'pointer',flexShrink:0}}>
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
