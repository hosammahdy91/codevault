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
  if (bytes < 1024) return bytes + ' B'
  return (bytes / 1024).toFixed(1) + ' KB'
}

const LANG_COLORS: Record<string, string> = {
  ts: '#4f8fff', js: '#ffb340', py: '#c6ff00',
  rs: '#ff4d6a', sol: '#9d6fff', other: '#6b7a94'
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
    const file = files.find(f => (f.path || f.name) === node.path || f.name === node.name)
    if (file) onSelectFile(file)
  }

  return (
    <div className="file-tree-list">
      {nodes.map(node => (
        <div key={node.path}>
          <div
            className={'file-tree-row' + (activeFile === node.path ? ' active' : '')}
            style={{paddingLeft: 12 + depth * 16 + 'px'}}
            onClick={() => node.type === 'dir' ? toggleDir(node.path) : handleFileClick(node)}
          >
            <span className="file-tree-icon">
              {node.type === 'dir'
                ? (collapsed.has(node.path) ? '▶' : '▼')
                : <span style={{width:'8px',height:'8px',borderRadius:'2px',background:LANG_COLORS[node.lang??'other'],display:'inline-block',marginRight:'2px'}} />
              }
            </span>
            <span className="file-tree-row-name">
              {node.type === 'dir'
                ? <strong style={{color:'var(--snow2)'}}>{node.name}</strong>
                : node.name
              }
            </span>
            {node.type === 'file' && node.size && (
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
