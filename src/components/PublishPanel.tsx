import { useState, useRef } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { hashCode, registerSnippetOnChain, buildFileTree, type Snippet, type FileEntry } from '../lib/aptos'
import { publishProject } from '../lib/supabase'

interface Props { onPublish: (s: Snippet) => void }
type Step = 'idle' | 'hashing' | 'signing' | 'saving' | 'done'

interface TreeNode {
  name: string
  type: 'file' | 'folder'
  children?: TreeNode[]
  file?: FileEntry
  path: string
}

function detectLang(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string,string> = { ts:'ts',tsx:'ts',js:'js',jsx:'js',py:'py',rs:'rs',sol:'sol',json:'other',md:'other',css:'other',html:'other' }
  return map[ext] ?? 'other'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB'
  return (bytes/1024/1024).toFixed(1) + ' MB'
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const icons: Record<string,string> = {
    ts:'📘', tsx:'📘', js:'📙', jsx:'📙', py:'📗', rs:'📕',
    sol:'📓', json:'📋', md:'📄', css:'🎨', html:'🌐',
    svg:'🖼', png:'🖼', jpg:'🖼', gif:'🖼', env:'🔒',
    gitignore:'🔧', lock:'🔒'
  }
  return icons[ext] ?? '📄'
}

function buildTree(files: FileEntry[]): TreeNode[] {
  const root: TreeNode[] = []

  files.forEach(file => {
    const parts = ((file as any).path || file.name).split('/')
    let current = root

    parts.forEach((part: string, i: number) => {
      const isLast = i === parts.length - 1
      const path = parts.slice(0, i+1).join('/')

      if (isLast) {
        current.push({ name: part, type: 'file', file, path })
      } else {
        let folder = current.find(n => n.name === part && n.type === 'folder')
        if (!folder) {
          folder = { name: part, type: 'folder', children: [], path }
          current.push(folder)
        }
        current = folder.children!
      }
    })
  })

  // Sort: folders first, then files
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    nodes.forEach(n => { if (n.children) n.children = sortNodes(n.children) })
    return nodes
  }

  return sortNodes(root)
}

function TreeView({ nodes, depth = 0, onSelect, selected }: {
  nodes: TreeNode[]
  depth?: number
  onSelect: (f: FileEntry) => void
  selected?: string
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (path: string) => {
    setCollapsed(prev => {
      const s = new Set(prev)
      s.has(path) ? s.delete(path) : s.add(path)
      return s
    })
  }

  return (
    <div>
      {nodes.map(node => (
        <div key={node.path}>
          {node.type === 'folder' ? (
            <>
              <div
                className="tree-folder"
                style={{paddingLeft: depth * 14 + 8 + 'px'}}
                onClick={() => toggle(node.path)}
              >
                <span className="tree-arrow">{collapsed.has(node.path) ? '▶' : '▼'}</span>
                <span className="tree-folder-icon">📁</span>
                <span className="tree-name">{node.name}</span>
                <span className="tree-count">{node.children?.length}</span>
              </div>
              {!collapsed.has(node.path) && node.children && (
                <TreeView nodes={node.children} depth={depth+1} onSelect={onSelect} selected={selected} />
              )}
            </>
          ) : (
            <div
              className={'tree-file' + (selected === node.path ? ' active' : '')}
              style={{paddingLeft: depth * 14 + 8 + 'px'}}
              onClick={() => node.file && onSelect(node.file)}
            >
              <span className="tree-file-icon">{getFileIcon(node.name)}</span>
              <span className="tree-name">{node.name}</span>
              <span className="tree-size">{node.file ? formatSize(node.file.size) : ''}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function PublishPanel({ onPublish }: Props) {
  const { signAndSubmitTransaction, account } = useWallet()
  const [files, setFiles]             = useState<FileEntry[]>([])
  const [projectName, setProjectName] = useState('')
  const [desc, setDesc]               = useState('')
  const [step, setStep]               = useState<Step>('idle')
  const [error, setError]             = useState('')
  const [isPrivate, setIsPrivate]     = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null)
  const [showTree, setShowTree]       = useState(false)
  const inputRef                      = useRef<HTMLInputElement>(null)

  const busy = step !== 'idle' && step !== 'done'
  const IGNORE = ['node_modules', '.git', 'dist', '.next', '__pycache__', '.DS_Store', '.git']

  function onDrop(e: React.DragEvent) { e.preventDefault(); readFiles(Array.from(e.dataTransfer.files)) }
  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) { if (e.target.files) readFiles(Array.from(e.target.files)) }

  function readFiles(rawFiles: File[]) {
    const filtered = rawFiles.filter(f => {
      const p = (f as any).webkitRelativePath || f.name
      return !IGNORE.some(ig => p.split('/').includes(ig))
    })
    Promise.all(filtered.map(file => new Promise<FileEntry>(resolve => {
      const r = new FileReader()
      const path = (file as any).webkitRelativePath || file.name
      r.onload = () => resolve({ name: file.name, content: r.result as string, size: file.size, lang: detectLang(file.name), path } as any)
      r.onerror = () => resolve({ name: file.name, content: '', size: file.size, lang: detectLang(file.name), path } as any)
      r.readAsText(file)
    }))).then(entries => {
      setFiles(entries)
      setShowTree(true)
      setSelectedFile(entries[0] ?? null)
      // Auto-detect project name from folder
      if (entries.length > 0) {
        const firstPath = (entries[0] as any).path || ''
        const folderName = firstPath.split('/')[0]
        if (folderName && !projectName) setProjectName(folderName)
      }
    })
  }

  async function publish() {
    if (!files.length) { setError('Upload at least one file.'); return }
    if (!projectName.trim()) { setError('Project name is required.'); return }
    if (!account) { setError('Wallet not connected.'); return }
    setError('')

    try {
      setStep('hashing')
      const codeHash = await hashCode(files.map(f => f.name + f.content).join(''))
      setStep('signing')
      await registerSnippetOnChain(signAndSubmitTransaction)
      setStep('saving')
      const totalSize = files.reduce((a, f) => a + f.size, 0)
      const langs = [...new Set(files.map(f => f.lang))]
      const fileTree = buildFileTree(files)
      await publishProject({
        wallet_address: account.address.toString(),
        name: projectName, description: desc || undefined,
        code_hash: codeHash.slice(0,20)+'...',
        tags: langs, size: formatSize(totalSize),
        lang: files[0]?.lang ?? 'other',
        files_count: files.length, views: 0, likes: 0,
        is_private: isPrivate,
        file_tree: fileTree
      })
      setStep('done')
      onPublish({
        id: 'snp_'+Date.now(), name: projectName,
        lang: files[0]?.lang ?? 'other',
        description: desc || 'No description.',
        code: files.map(f => '// === '+f.name+' ===\n'+f.content).join('\n\n'),
        tags: langs, codeHash: codeHash.slice(0,20)+'...',
        timestamp: new Date().toISOString().slice(0,10),
        size: formatSize(totalSize), views: 0, copies: 0, files, is_private: isPrivate
      })
      setFiles([]); setProjectName(''); setDesc(''); setShowTree(false); setSelectedFile(null)
      setTimeout(() => setStep('idle'), 1500)
    } catch (e: any) { setError(e?.message ?? 'Transaction failed.'); setStep('idle') }
  }

  const tree = buildTree(files)
  const totalSize = files.reduce((a, f) => a + f.size, 0)

  const stepLabels = [
    { key:'hashing', label:'Hashing all files', badge:'Local' },
    { key:'signing', label:'Sign transaction', badge:'Wallet' },
    { key:'saving',  label:'Saving to database', badge:'Supabase' },
  ]
  const currentIdx = stepLabels.findIndex(s => s.key === step)

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-label">Publish Project</span>
        {files.length > 0 && (
          <span style={{fontSize:'11px',color:'var(--acid)',fontFamily:'var(--mono)'}}>
            {files.length} files · {formatSize(totalSize)}
          </span>
        )}
      </div>
      <div className="panel-body">

        <div className="field">
          <label className="field-label">Project Name</label>
          <input className="field-input mono" value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="e.g. aptos-utils" disabled={busy} />
        </div>

        <div className="field">
          <label className="field-label">Description</label>
          <input className="field-input" value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="What does this project do?" disabled={busy} />
        </div>

        {/* Drop Zone */}
        {!showTree ? (
          <div
            className="drop-zone"
            onDrop={onDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" multiple style={{display:'none'}}
              onChange={onFileInput}
              accept=".ts,.tsx,.js,.jsx,.py,.rs,.sol,.json,.md,.css,.html,.txt,.env,.gitignore"
              {...{'webkitdirectory':'','mozdirectory':''} as any} />
            <div className="drop-hint">
              <div className="drop-icon">📁</div>
              <div className="drop-text">Drop folder here or click to select</div>
              <div className="drop-sub">node_modules & dist ignored automatically</div>
            </div>
          </div>
        ) : (
          /* GitHub-style file browser */
          <div className="gh-browser">
            <div className="gh-browser-header">
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <span style={{fontFamily:'var(--mono)',fontSize:'12px',color:'var(--snow2)',fontWeight:600}}>
                  📁 {projectName || 'project'}
                </span>
                <span style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--snow4)'}}>
                  {files.length} files
                </span>
              </div>
              <button
                style={{background:'transparent',border:'1px solid rgba(255,77,106,0.2)',color:'var(--rose)',borderRadius:'6px',padding:'3px 10px',fontSize:'11px',cursor:'pointer'}}
                onClick={() => { setFiles([]); setShowTree(false); setSelectedFile(null) }}
              >
                Change
              </button>
            </div>

            <div className="gh-browser-body">
              {/* File Tree */}
              <div className="gh-tree">
                <TreeView
                  nodes={tree}
                  onSelect={f => setSelectedFile(f)}
                  selected={(selectedFile as any)?.path}
                />
              </div>

              {/* File Preview */}
              {selectedFile && (
                <div className="gh-preview">
                  <div className="gh-preview-header">
                    <span style={{fontFamily:'var(--mono)',fontSize:'11px',color:'var(--snow2)'}}>
                      {getFileIcon(selectedFile.name)} {selectedFile.name}
                    </span>
                    <span style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--snow4)'}}>
                      {formatSize(selectedFile.size)}
                    </span>
                  </div>
                  <div className="gh-preview-code">
                    <pre>{selectedFile.content?.slice(0,2000)}{(selectedFile.content?.length ?? 0) > 2000 ? '\n...' : ''}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Privacy */}
        <div className="privacy-toggle" style={{marginTop:'10px'}}>
          <button className={'privacy-opt' + (!isPrivate ? ' active' : '')} onClick={() => setIsPrivate(false)} type="button">🌍 Public</button>
          <button className={'privacy-opt' + (isPrivate ? ' active' : '')} onClick={() => setIsPrivate(true)} type="button">🔒 Private</button>
        </div>
        <p style={{fontSize:'11px',color:'var(--snow4)',marginBottom:'8px'}}>
          {isPrivate ? 'Only you can see this project.' : 'Visible to everyone on Explore.'}
        </p>

        {/* Pipeline */}
        {step !== 'idle' && (
          <div className="pipeline" style={{marginTop:'8px'}}>
            {stepLabels.map((s, i) => {
              const idx = stepLabels.findIndex(x => x.key === step)
              const state = step === 'done' ? 'done' : i < idx ? 'done' : i === idx ? 'active' : 'pending'
              return (
                <div key={s.key} className={'pipeline-step ' + state}>
                  <div className="step-circle">{state === 'done' ? '✓' : i+1}</div>
                  <span className="step-name">{s.label}</span>
                  <span className="step-badge">{s.badge}</span>
                </div>
              )
            })}
            <div className="pipeline-progress">
              <div className="pipeline-bar" style={{width: step==='done'?'100%':((currentIdx+1)/stepLabels.length*100)+'%'}} />
            </div>
          </div>
        )}

        {error && <p className="field-error">{error}</p>}

        <button className="btn btn-acid full" onClick={publish} disabled={busy || !files.length}>
          {busy ? 'Publishing...' : step === 'done' ? '✓ Published!' : '⬆ Publish to Aptos'}
        </button>
      </div>
    </div>
  )
}
