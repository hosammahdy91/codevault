import { useState } from 'react'
import { type TreeNode, type FileEntry } from '../lib/aptos'

interface Props {
  nodes: TreeNode[]
  files: FileEntry[]
  onSelectFile: (file: FileEntry) => void
  activeFile?: string
  depth?: number
}

function formatSize(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  return (bytes / 1024).toFixed(1) + ' KB'
}

const LANG_COLORS: Record<string, string> = {
  ts: '#4f8fff', tsx: '#4f8fff',
  js: '#ffb340', jsx: '#ffb340',
  py: '#c6ff00', rs: '#ff4d6a',
  sol: '#9d6fff', other: '#6b7a94',
  css: '#ff79c6', md: '#8be9fd',
  json: '#f1fa8c', html: '#ff5555'
}

export function FileTree({ nodes, files, onSelectFile, activeFile, depth = 0 }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleDir(path: string) {
    setCollapsed(prev => {
      const s = new Set(prev)
      s.has(path) ? s.delete(path) : s.add(path)
      return s
    })
  }

  function handleFileClick(node: TreeNode) {
    // Match by name since paths may vary
    const nodeName = node.name
    let file = files.find(f => f.name === nodeName)
    if (!file) file = files.find(f => f.path === node.path)
    if (!file) file = files.find(f => (f.path || f.name).includes(nodeName))
    if (!file) file = files.find(f => nodeName.includes(f.name))
    console.log('Click:', nodeName, 'Found:', file?.name, 'Files:', files.map(f=>f.name))
    if (file) onSelectFile(file)
  }

  const getLangColor = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() ?? 'other'
    return LANG_COLORS[ext] ?? LANG_COLORS.other
  }

  return (
    <div className="file-tree-list">
      {nodes.map(node => (
        <div key={node.path}>
          <div
            className={'file-tree-row' + (activeFile === node.path || activeFile === node.name ? ' active' : '')}
            style={{paddingLeft: 12 + depth * 16 + 'px'}}
            onClick={() => node.type === 'dir' ? toggleDir(node.path) : handleFileClick(node)}
          >
            <span className="file-tree-icon">
              {node.type === 'dir' ? (
                <span style={{fontSize:'10px', color:'var(--snow4)'}}>
                  {collapsed.has(node.path) ? '▶' : '▼'}
                </span>
              ) : (
                <span style={{
                  width:'8px', height:'8px', borderRadius:'2px',
                  background: getLangColor(node.name),
                  display:'inline-block'
                }} />
              )}
            </span>
            <span className="file-tree-row-name">
              {node.type === 'dir'
                ? <strong style={{color:'var(--snow2)'}}>{node.name}</strong>
                : node.name
              }
            </span>
            {node.type === 'file' && node.size != null && (
              <span className="file-tree-row-size">{formatSize(node.size)}</span>
            )}
          </div>
          {node.type === 'dir' && !collapsed.has(node.path) && node.children && (
            <FileTree
              nodes={node.children}
              files={files}
              onSelectFile={onSelectFile}
              activeFile={activeFile}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </div>
  )
}
