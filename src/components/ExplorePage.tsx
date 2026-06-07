import { useState, useEffect } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { getAllProjects, toggleLike, type Project } from '../lib/supabase'

export function ExplorePage({ onBack }: { onBack: () => void }) {
  const { account } = useWallet()
  const wallet = account?.address.toString() ?? ''
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getAllProjects().then(data => { setProjects(data); setLoading(false) })
  }, [])

  async function handleLike(projectId: string) {
    if (!wallet) return
    const liked = await toggleLike(wallet, projectId)
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, likes: (p.likes ?? 0) + (liked ? 1 : -1) } : p))
  }

  const langs = ['all', 'ts', 'js', 'py', 'rs', 'sol']
  const filtered = projects.filter(p => {
    const langOk = filter === 'all' || p.lang === filter
    const q = query.toLowerCase()
    return langOk && (!q || p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q))
  })

  return (
    <div className="explore-page">
      <button className="btn btn-outline back-btn" onClick={onBack}>Back</button>
      <div className="explore-header">
        <div>
          <div className="page-eyebrow">Community</div>
          <h2 className="page-title">Explore <em>Projects</em></h2>
          <p className="page-sub">Discover projects published on Aptos by the community.</p>
        </div>
        <div className="stat-block" style={{textAlign:'center',padding:'12px 24px'}}>
          <span className="stat-val">{projects.length}</span>
          <span className="stat-lbl">Total Projects</span>
        </div>
      </div>
      <div className="toolbar" style={{marginBottom:'16px'}}>
        <div className="filter-group">
          {langs.map(l => (
            <button key={l} className={'filter-chip'+(filter===l?' active':'')} onClick={() => setFilter(l)}>
              {l === 'all' ? 'All' : l.toUpperCase()}
            </button>
          ))}
        </div>
        <input className="search-input" placeholder="Search projects..." value={query} onChange={e => setQuery(e.target.value)} />
      </div>
      {loading ? <div className="profile-loading">Loading projects...</div>
      : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📭</div><div className="empty-title">No projects found</div></div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {filtered.map(p => (
            <div key={p.id} className="snippet-card">
              <div className="card-top">
                <div className={'card-lang-icon lang-'+(p.lang??'other')}>{(p.lang??'other').slice(0,2).toUpperCase()}</div>
                <div className="card-info">
                  <div className="card-filename">{p.name}</div>
                  <div className="card-desc">{p.description}</div>
                  <div className="card-meta">
                    <span>{p.wallet_address.slice(0,6)}...{p.wallet_address.slice(-4)}</span>
                    <span>Views: {p.views ?? 0}</span>
                    <span>{p.size}</span>
                    <span>{p.created_at?.slice(0,10)}</span>
                  </div>
                </div>
                <button className="btn-icon" onClick={() => handleLike(p.id!)} style={{flexDirection:'column',gap:'2px',height:'auto',padding:'6px'}}>
                  <span style={{fontSize:'14px'}}>+</span>
                  <span style={{fontSize:'10px',fontFamily:'var(--mono)'}}>{p.likes ?? 0}</span>
                </button>
              </div>
              <div className="card-chain">
                <span className="chain-badge"><span className="chain-dot" /> On-chain</span>
                <span style={{fontFamily:'var(--mono)',fontSize:'10px'}}>Hash: {p.code_hash}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
