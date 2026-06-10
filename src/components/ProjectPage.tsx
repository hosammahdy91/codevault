import { useState, useEffect } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { getStarredProjects, toggleStar as toggleStarFn, type Project } from '../lib/supabase'
import { CommentsSection } from './CommentsSection'

interface Props {
  project: Project
  onBack: () => void
  onViewProfile?: (wallet: string) => void
}

export function ProjectPage({ project: p, onBack, onViewProfile }: Props) {
  const { account } = useWallet()
  const wallet = account?.address.toString() ?? ''
  const [isStarred, setIsStarred] = useState(false)
  const [stars, setStars] = useState(p.stars ?? 0)
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!wallet) return
    getStarredProjects(wallet).then(list => setIsStarred(list.includes(p.id!)))
  }, [wallet, p.id])

  async function handleStar() {
    if (!wallet) return
    setLoading(true)
    const nowStarred = await toggleStarFn(wallet, p.id!)
    setIsStarred(nowStarred)
    setStars(prev => Math.max(0, prev + (nowStarred ? 1 : -1)))
    setLoading(false)
  }

  const files: { name: string; content: string }[] = []
  const codeStr = p.code ?? ''
  if (codeStr) {
    const separator = '// === '
    const parts = codeStr.split(separator)
    for (let i = 1; i < parts.length; i++) {
      const lines = parts[i].split('\n')
      const name = lines[0].replace(' ===', '').trim()
      const fileContent = lines.slice(1).join('\n')
      if (name) files.push({ name, content: fileContent })
    }
  }

  const hasFiles = files.length > 0
  const currentFile = activeFile ? files.find(f => f.name === activeFile) : files[0]

  return (
    <div className="project-page">
      <button className="btn btn-outline back-btn" onClick={onBack}>Back</button>

      <div className="project-header">
        <div className="project-header-left">
          <div className={'card-lang-icon lang-' + (p.lang ?? 'other')} style={{width:'48px',height:'48px',fontSize:'13px'}}>
            {(p.lang ?? 'other').slice(0,2).toUpperCase()}
          </div>
          <div>
            <h1 className="project-title">{p.name}</h1>
            <div className="project-meta">
              <span
                style={{cursor:'pointer', color:'var(--acid)'}}
                onClick={() => onViewProfile?.(p.wallet_address)}
              >
                {p.wallet_address.slice(0,6)}...{p.wallet_address.slice(-4)}
              </span>
              <span>{p.created_at?.slice(0,10)}</span>
              <span>{p.size}</span>
              <span>{p.files_count ?? 0} files</span>
            </div>
            <div style={{marginTop:'6px', display:'flex', gap:'6px', flexWrap:'wrap'}}>
              {(p.tags ?? []).map(t => (
                <span key={t} className={'tag tag-' + t}>{t}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="project-header-right">
          <button
            className={'star-btn' + (isStarred ? ' starred' : '')}
            onClick={handleStar}
            disabled={loading}
            style={{flexDirection:'row', gap:'8px', padding:'8px 16px'}}
          >
            <span className="star-icon" style={{fontSize:'16px'}}>{isStarred ? '★' : '☆'}</span>
            <span style={{fontSize:'13px', fontWeight:600}}>Star</span>
            <span className="star-count" style={{fontSize:'13px'}}>{stars}</span>
          </button>
        </div>
      </div>

      {p.description && p.description !== 'No description.' && (
        <div className="project-desc-box">
          <p>{p.description}</p>
        </div>
      )}

      <div className="project-chain-bar">
        <span className="chain-badge"><span className="chain-dot" /> On-chain verified</span>
        <span style={{fontFamily:'var(--mono)',fontSize:'11px'}}>Hash: {p.code_hash}</span>
        <span style={{fontFamily:'var(--mono)',fontSize:'11px',color:'var(--snow4)'}}>Aptos Testnet</span>
      </div>

      {hasFiles && (
        <div className="project-files">
          <div className="project-files-sidebar">
            <div className="panel-label" style={{padding:'10px 14px', borderBottom:'1px solid var(--line)'}}>Files</div>
            {files.map(f => (
              <div
                key={f.name}
                className={'file-tree-item' + ((activeFile ?? files[0]?.name) === f.name ? ' active' : '')}
                onClick={() => setActiveFile(f.name)}
              >
                <span className={'file-dot lang-dot-' + (p.lang ?? 'other')} />
                <span className="file-tree-name">{f.name}</span>
              </div>
            ))}
          </div>
          <div className="project-files-content">
            <div className="file-preview-head">
              <span style={{fontFamily:'var(--mono)', fontSize:'12px', color:'var(--snow2)'}}>
                {currentFile?.name}
              </span>
            </div>
            <div className="code-scroll" style={{maxHeight:'420px'}}>
              <pre>{currentFile?.content}</pre>
            </div>
          </div>
        </div>
      )}

      <div className="project-comments">
        <CommentsSection projectId={p.id!} />
      </div>
    </div>
  )
}
