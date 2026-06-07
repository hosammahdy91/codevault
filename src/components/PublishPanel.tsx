import { useState, useRef } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { hashCode, registerSnippetOnChain, type Snippet } from '../lib/aptos'

interface Props { onPublish: (s: Snippet) => void }
type Step = 'idle' | 'hashing' | 'signing' | 'done'

interface FileEntry {
  name: string
  content: string
  size: number
  lang: string
}

function detectLang(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'ts', tsx: 'ts', js: 'js', jsx: 'js',
    py: 'py', rs: 'rs', sol: 'sol',
    json: 'other', md: 'other', css: 'other', html: 'other'
  }
  return map[ext] ?? 'other'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  return (bytes / 1024).toFixed(1) + ' KB'
}

export function PublishPanel({ onPublish }: Props) {
  const { signAndSubmitTransaction, account } = useWallet()
  const [files, setFiles]       = useState<FileEntry[]>([])
  const [activeFile, setActiveFile] = useState<FileEntry | null>(null)
  const [projectName, setProjectName] = useState('')
  const [desc, setDesc]         = useState('')
  const [step, setStep]         = useState<Step>('idle')
  const [error, setError]       = useState('')
  const inputRef                = useRef<HTMLInputElement>(null)

  const busy = step !== 'idle' && step !== 'done'

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    readFiles(Array.from(e.dataTransfer.files))
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) readFiles(Array.from(e.target.files))
  }

  function readFiles(rawFiles: File[]) {
    const readers = rawFiles.map(file =>
      new Promise<FileEntry>(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve({
          name:    file.name,
          content: reader.result as string,
          size:    file.size,
          lang:    detectLang(file.name),
        })
        reader.readAsText(file)
      })
    )
    Promise.all(readers).then(entries => {
      setFiles(prev => {
        const merged = [...prev]
        entries.forEach(e => {
          const idx = merged.findIndex(f => f.name === e.name)
          if (idx >= 0) merged[idx] = e
          else merged.push(e)
        })
        return merged
      })
      if (!activeFile) setActiveFile(entries[0])
    })
  }

  function removeFile(name: string) {
    setFiles(prev => {
      const next = prev.filter(f => f.name !== name)
      if (activeFile?.name === name) setActiveFile(next[0] ?? null)
      return next
    })
  }

  async function publish() {
    if (files.length === 0) { setError('Upload at least one file.'); return }
    if (!projectName.trim()) { setError('Project name is required.'); return }
    if (!account) { setError('Wallet not connected.'); return }
    setError('')

    try {
      setStep('hashing')
      const combined = files.map(f => f.name + f.content).join('')
      const codeHash = await hashCode(combined)

      setStep('signing')
      await registerSnippetOnChain(signAndSubmitTransaction, {
        name: projectName, lang: files[0]?.lang ?? 'other',
        description: desc, codeHash,
      })

      setStep('done')
      const totalSize = files.reduce((a, f) => a + f.size, 0)

      onPublish({
        id:          'snp_' + Date.now(),
        name:        projectName,
        lang:        files[0]?.lang ?? 'other',
        description: desc || 'No description.',
        code:        files.map(f => '// === ' + f.name + ' ===\n' + f.content).join('\n\n'),
        tags:        [...new Set(files.map(f => f.lang))],
        codeHash:    codeHash.slice(0, 20) + '...',
        timestamp:   new Date().toISOString().slice(0, 10),
        size:        formatSize(totalSize),
        views:       0,
        copies:      0,
        files:       files,
      })

      setFiles([]); setActiveFile(null)
      setProjectName(''); setDesc('')
      setTimeout(() => setStep('idle'), 1500)
    } catch (e: any) {
      setError(e?.message ?? 'Transaction failed.')
      setStep('idle')
    }
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-label">Publish Project</span>
        {files.length > 0 && (
          <span style={{fontSize:'11px', color:'var(--acid)', fontFamily:'var(--mono)'}}>
            {files.length} file{files.length > 1 ? 's' : ''}
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
        <div
          className={'drop-zone' + (files.length > 0 ? ' has-files' : '')}
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef} type="file" multiple
            style={{display:'none'}}
            onChange={onFileInput}
            accept=".ts,.tsx,.js,.jsx,.py,.rs,.sol,.json,.md,.css,.html,.txt"
            // @ts-ignore
            {...{'webkitdirectory': '', 'mozdirectory': ''}}
          />
          {files.length === 0 ? (
            <div className="drop-hint">
              <div className="drop-icon">📁</div>
              <div className="drop-text">Drop folder here or click to select folder</div>
              <div className="drop-sub">Select your entire project folder</div>
            </div>
          ) : (
            <div className="drop-text" style={{fontSize:'11px', color:'var(--acid)'}}>
              + Add another folder
            </div>
          )}
        </div>

        {/* Folder Summary */}
        {files.length > 0 && (
          <div className="folder-summary">
            <div className="folder-summary-left">
              <span className="folder-icon">📁</span>
              <div>
                <div className="folder-name">{projectName || 'project'}/</div>
                <div className="folder-meta">{files.length} files · {formatSize(files.reduce((a,f) => a + f.size, 0))}</div>
              </div>
            </div>
            <button className="folder-clear" onClick={() => { setFiles([]); setActiveFile(null) }}>
              ×
            </button>
          </div>
        )}

        {/* Code Preview */}
        {activeFile && (
          <div className="file-preview">
            <div className="file-preview-head">
              <span style={{fontFamily:'var(--mono)', fontSize:'11px', color:'var(--snow2)'}}>
                {activeFile.name}
              </span>
              <span style={{fontFamily:'var(--mono)', fontSize:'10px', color:'var(--snow4)'}}>
                {formatSize(activeFile.size)}
              </span>
            </div>
            <div className="file-preview-code">
              <pre>{activeFile.content.slice(0, 1500)}{activeFile.content.length > 1500 ? '\n...' : ''}</pre>
            </div>
          </div>
        )}

        {/* Pipeline */}
        {step !== 'idle' && (
          <div className="pipeline" style={{marginTop:'12px'}}>
            {[
              { key: 'hashing', label: 'Hashing all files',       badge: 'Local'  },
              { key: 'signing', label: 'Sign transaction (wallet)', badge: 'Wallet' },
            ].map((s, i) => {
              const idx = ['hashing','signing'].indexOf(step)
              const state = step === 'done' ? 'done' : i < idx ? 'done' : i === idx ? 'active' : 'pending'
              return (
                <div key={s.key} className={'pipeline-step ' + state}>
                  <div className="step-circle">{state === 'done' ? '✓' : i + 1}</div>
                  <span className="step-name">{s.label}</span>
                  <span className="step-badge">{s.badge}</span>
                </div>
              )
            })}
            <div className="pipeline-progress">
              <div className="pipeline-bar" style={{width: step === 'done' ? '100%' : step === 'signing' ? '60%' : '30%'}} />
            </div>
          </div>
        )}

        {error && <p className="field-error">{error}</p>}

        <button className="btn btn-acid full" onClick={publish} disabled={busy || files.length === 0}>
          {busy ? 'Publishing...' : step === 'done' ? 'Published!' : 'Publish to Aptos'}
        </button>
      </div>
    </div>
  )
}
