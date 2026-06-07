import { useState } from 'react'
import { type Snippet } from '../lib/aptos'

const LANG_LABELS: Record<string, string> = {
  ts: 'TypeScript', js: 'JavaScript',
  py: 'Python', rs: 'Rust', sol: 'Solidity'
}

export function SnippetCard({ snippet: s }: { snippet: Snippet }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard?.writeText(s.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const langLabel = LANG_LABELS[s.lang] ?? s.lang.toUpperCase()

  return (
    <div className="snippet-card">
      <div className="card-top">
        <div className={'card-lang-icon lang-' + s.lang}>
          {langLabel.slice(0, 2).toUpperCase()}
        </div>
        <div className="card-info">
          <div className="card-filename">{s.name}</div>
          <div className="card-desc">{s.description}</div>
          <div className="card-meta">
            <span>Views: {s.views}</span>
            <span>Copies: {s.copies}</span>
            <span>{s.timestamp}</span>
            <span>{s.size}</span>
          </div>
        </div>
        <div className="card-actions">
          <button className="btn-icon" onClick={() => setOpen(o => !o)} title="Preview">
            Code
          </button>
          <button className={'btn-icon ' + (copied ? 'success' : '')} onClick={copy} title="Copy">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
      <div className="card-tags">
        {s.tags.map(t => (
          <span key={t} className={'tag tag-' + s.lang}>{t}</span>
        ))}
      </div>
      {open && (
        <div className="code-panel open">
          <div className="code-scroll">
            <pre>{s.code}</pre>
          </div>
        </div>
      )}
      <div className="card-chain">
        <span className="chain-badge">
          <span className="chain-dot" />
          {' On-chain'}
        </span>
        <span>{'Hash: '}
          <code style={{fontSize:'10px'}}>{s.codeHash}</code>
        </span>
        <span>{'Published: ' + s.timestamp}</span>
      </div>
    </div>
  )
}
