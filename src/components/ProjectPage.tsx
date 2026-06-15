import { useState, useEffect } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { getStarredProjects, toggleStar as toggleStarFn, type Project } from '../lib/supabase'
import { buildFileTree, type FileEntry, type TreeNode } from '../lib/aptos'
import { CommentsSection } from './CommentsSection'
import { FileTree } from './FileTree'

interface Props {
  project: Project
  onBack: () => void
  onViewProfile?: (wallet: string) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  return (bytes / 1024).toFixed(1) + ' KB'
}

export function ProjectPage({ project: p, onBack, onViewProfile }: Props) {
  const { account } = useWallet()
  const wallet = account?.address.toString() ?? ''
  const [isStarred, setIsStarred] = useState(false)
  const [stars, setStars] = useState(p.stars ?? 0)
  const [activeFile, setActiveFile] = useState<FileEntry | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!wallet) return
    getStarredProjects(wallet).then(list => setIsStarred(list.includes(p.id!)))
  }, [wallet, p.id])

  useEffect(() => {
    // Increment view count
    if (p.id) {
      import('../lib/supabase').then(({ supabase }) => {
        supabase.rpc('increment_views', { project_id: p.id })
      })
    }
  }, [p.id])

  async function handleStar() {
    if (!wallet) return
    setLoading(true)
    const nowStarred = await toggleStarFn(wallet, p.id!)
    setIsStarred(nowStarred)
    setStars(prev => Math.max(0, prev + (nowStarred ? 1 : -1)))
    setLoading(false)
  }

  // Parse files from code string
  const files: FileEntry[] = []
  const codeStr = p.code ?? ''
  if (codeStr) {
    const separator = '// === '
    const parts = codeStr.split(separator)
    for (let i = 1; i < parts.length; i++) {
      const lines = parts[i].split('\n')
      const name = lines[0].replace(' ===', '').trim()
      const fileContent = lines.slice(1).join('\n')
      if (name) files.push({
        name,
        path: name,
        content: fileContent,
        size: new Blob([fileContent]).size,
        lang: name.split('.').pop() ?? 'other'
      })
    }
  }

  // Use saved file_tree or build from files
  const treeNodes: TreeNode[] = p.file_tree
    ? (typeof p.file_tree === 'string' ? JSON.parse(p.file_tree) : p.file_tree)
    : buildFileTree(files)

  const hasFiles = files.length > 0 || treeNodes.length > 0

  return (
    <div className="project-page">
      <button className="btn btn-outline back-btn" onClick={onBack}>Back</button>

      {/* Header */}
      <div className="project-header">
        <div className="project-header-left">
          <div className={'card-lang-icon lang-' + (p.lang ?? 'other')} style={{width:'48px',height:'48px',fontSize:'13px'}}>
            {(p.lang ?? 'other').slice(0,2).toUpperCase()}
          </div>
          <div>
            <h1 className="project-title">{p.name}</h1>
            <div className="project-meta">
              <span style={{cursor:'pointer',color:'var(--acid)'}} onClick={() => onViewProfile?.(p.wallet_address)}>
                {p.wallet_address.slice(0,6)}...{p.wallet_address.slice(-4)}
              </span>
              <span>{p.created_at?.slice(0,10)}</span>
              <span>{p.size}</span>
              <span>{p.files_count ?? files.length} files</span>
            </div>
            <div style={{marginTop:'6px',display:'flex',gap:'6px',flexWrap:'wrap'}}>
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
            style={{flexDirection:'row',gap:'8px',padding:'8px 16px'}}
          >
            <span className="star-icon" style={{fontSize:'16px'}}>{isStarred ? '★' : '☆'}</span>
            <span style={{fontSize:'13px',fontWeight:600}}>Star</span>
            <span className="star-count" style={{fontSize:'13px'}}>{stars}</span>
          </button>
        </div>
      </div>

      {/* Description */}
      {p.description && p.description !== 'No description.' && (
        <div className="project-desc-box"><p>{p.description}</p></div>
      )}

      {/* On-chain proof */}
      <div className="project-chain-bar">
        <span className="chain-badge"><span className="chain-dot" /> On-chain verified</span>
        <span style={{fontFamily:'var(--mono)',fontSize:'11px'}}>Hash: {p.code_hash}</span>
        <span style={{fontFamily:'var(--mono)',fontSize:'11px',color:'var(--snow4)'}}>Aptos Testnet</span>
      </div>

      {/* GitHub-style file browser */}
      {hasFiles && (
        <div className="github-browser">
          {/* File tree sidebar */}
          <div className="github-sidebar">
            <div className="github-sidebar-head">
              <span style={{fontFamily:'var(--mono)',fontSize:'11px',color:'var(--snow3)'}}>
                📁 {p.name}/
              </span>
              <span style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--snow4)'}}>
                {p.files_count ?? files.length} files
              </span>
            </div>
            <FileTree
              nodes={treeNodes}
              files={files}
              onSelectFile={setActiveFile}
              activeFile={activeFile?.path}
            />
          </div>

          {/* File content */}
          <div className="github-content">
            {activeFile ? (
              <>
                <div className="github-content-head">
                  <span style={{fontFamily:'var(--mono)',fontSize:'12px',color:'var(--snow2)'}}>
                    {activeFile.path}
                  </span>
                  <span style={{fontFamily:'var(--mono)',fontSize:'11px',color:'var(--snow4)'}}>
                    {formatSize(activeFile.size)}
                  </span>
                </div>
                <div className="github-code">
                  <div className="github-line-nums">
                    {activeFile.content.split('\n').map((_,i) => (
                      <div key={i} className="line-num">{i + 1}</div>
                    ))}
                  </div>
                  <pre className="github-pre">{activeFile.content}</pre>
                </div>
              </>
            ) : (
              <div className="github-empty">
                <div style={{fontSize:'32px',marginBottom:'8px',opacity:0.3}}>📄</div>
                <div style={{color:'var(--snow4)',fontSize:'13px'}}>Select a file to view its content</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="project-comments">
        <CommentsSection projectId={p.id!} />
      </div>
    </div>
  )
}
