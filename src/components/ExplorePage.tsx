import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { getAllProjects, toggleStar, getStarredProjects, type Project } from '../lib/supabase'

export function ExplorePage({ onBack }: { onBack: () => void }) {
  const { account } = useWallet()
  const wallet = account?.address.toString() ?? ''
  const [projects, setProjects] = useState<Project[]>([])
  const [starred, setStarred] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('newest')

  const loadData = useCallback(async () => {
    const [data, stars] = await Promise.all([
      getAllProjects(),
      wallet ? getStarredProjects(wallet) : Promise.resolve([])
    ])
    setProjects(data)
    setStarred(new Set(stars))
    setLoading(false)
  }, [wallet])

  useEffect(() => { loadData() }, [loadData])

  async function handleStar(projectId: string) {
    if (!wallet) return
    const wasStarred = starred.has(projectId)
    // optimistic UI update
    setStarred(prev => { const s = new Set(prev); wasStarred ? s.delete(projectId) : s.add(projectId); return s })
    setProjects(prev => prev.map(p => p.id === projectId
      ? { ...p, stars: Math.max(0, (p.stars ?? 0) + (wasStarred ? -1 : 1)) }
      : p
    ))
    await toggleStar(wallet, projectId)
    // re-fetch to sync real count AND starred state from DB
    const [fresh, freshStars] = await Promise.all([
      getAllProjects(),
      getStarredProjects(wallet)
    ])
    setProjects(fresh)
    setStarred(new Set(freshStars))
  }

  const langs = ['all', 'ts', 'js', 'py', 'rs', 'sol']

  const filtered = projects
    .filter(p => {
      const langOk = filter === 'all' || p.lang === filter
      const q = query.toLowerCase()
      return langOk && (!q || p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q))
    })
    .sort((a, b) => {
      if (sort === 'stars') return (b.stars ?? 0) - (a.stars ?? 0)
      if (sort === 'views') return (b.views ?? 0) - (a.views ?? 0)
      return new Date(b.created_at ?? '').getTime() - new Date(a.created_at ?? '').getTime()
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
        <div className="stats-cluster">
          <div className="stat-block"><span className="stat-val">{projects.length}</span><span className="stat-lbl">Projects</span></div>
          <div className="stat-block"><span className="stat-val">{projects.reduce((a,p)=>a+(p.stars??0),0)}</span><span className="stat-lbl">Stars</span></div>
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
        <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="stars">Most Starred</option>
          <option value="views">Most Viewed</option>
        </select>
      </div>

      {loading ? <div className="profile-loading">Loading projects...</div>
      : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📭</div><div className="empty-title">No projects found</div></div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {filtered.map(p => {
            const isStarred = starred.has(p.id!)
            return (
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
                  <button
                    className={'star-btn' + (isStarred ? ' starred' : '')}
                    onClick={() => handleStar(p.id!)}
                    title={isStarred ? 'Unstar' : 'Star'}
                  >
                    <span className="star-icon">{isStarred ? '★' : '☆'}</span>
                    <span className="star-count">{p.stars ?? 0}</span>
                  </button>
                </div>
                <div className="card-chain">
                  <span className="chain-badge"><span className="chain-dot" /> On-chain</span>
                  <span style={{fontFamily:'var(--mono)',fontSize:'10px'}}>Hash: {p.code_hash}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
