import { useState } from 'react'
import { PublishPanel } from './PublishPanel'
import { SnippetCard } from './SnippetCard'
import { type Snippet } from '../lib/aptos'

interface Props { snippets: Snippet[]; onPublish: (s: Snippet) => void }

export function Dashboard({ snippets, onPublish }: Props) {
  const [filter, setFilter] = useState('all')
  const [query,  setQuery]  = useState('')

  const langs = ['all', 'ts', 'js', 'py', 'rs', 'sol']

  const filtered = snippets.filter(s => {
    const langOk  = filter === 'all' || s.lang === filter
    const q       = query.toLowerCase()
    const queryOk = !q || s.name.toLowerCase().includes(q)
      || s.description.toLowerCase().includes(q)
      || s.tags.some(t => t.includes(q))
    return langOk && queryOk
  })

  return (
    <div className="app-layout">
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Decentralized Registry · Aptos Testnet</div>
          <h1 className="page-title">Code<em>Vault</em></h1>
          <p className="page-sub">Every snippet registered on-chain. Immutable. Verifiable.</p>
        </div>
        <div className="stats-cluster">
          {[
            { val: snippets.length,                              lbl: 'Snippets' },
            { val: snippets.reduce((a, s) => a + s.views,  0), lbl: 'Views'    },
            { val: snippets.reduce((a, s) => a + s.copies, 0), lbl: 'Copies'   },
          ].map(s => (
            <div key={s.lbl} className="stat-block">
              <span className="stat-val">{s.val}</span>
              <span className="stat-lbl">{s.lbl}</span>
            </div>
          ))}
        </div>
      </div>

      <aside className="sidebar">
        <PublishPanel onPublish={onPublish} />
        <div className="panel">
          <div className="panel-head">
            <span className="panel-label">Network</span>
            <span className="live-dot" />
          </div>
          <div className="panel-body info-list">
            {[
              { k: 'Network',    v: 'Aptos Testnet',        cls: 'acid'  },
              { k: 'Storage',    v: 'On-chain (Shelby ready)', cls: ''   },
              { k: 'SDK',        v: '@aptos-labs/ts-sdk',   cls: ''      },
              { k: 'Proof type', v: 'SHA-256 tx hash',      cls: 'amber' },
            ].map(r => (
              <div key={r.k} className="info-row">
                <span className="info-key">{r.k}</span>
                <span className={`info-val ${r.cls}`}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="content-col">
        <div className="toolbar">
          <div className="filter-group">
            {langs.map(l => (
              <button key={l}
                className={`filter-chip ${filter === l ? 'active' : ''}`}
                onClick={() => setFilter(l)}>
                {l === 'all' ? 'All' : l.toUpperCase()}
              </button>
            ))}
          </div>
          <input className="search-input" placeholder="Search snippets…"
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-title">No snippets yet</div>
            <div className="empty-sub">Publish your first snippet using the panel on the left.</div>
          </div>
        ) : (
          filtered.map(s => <SnippetCard key={s.id} snippet={s} />)
        )}
      </div>
    </div>
  )
}
