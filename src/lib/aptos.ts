import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'

export const aptosClient = new Aptos(
  new AptosConfig({ network: Network.TESTNET })
)

export interface FileEntry {
  name: string
  path: string
  content: string
  size: number
  lang: string
}

export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  lang?: string
  children?: TreeNode[]
}

export function buildFileTree(files: FileEntry[]): TreeNode[] {
  const root: TreeNode[] = []

  files.forEach(file => {
    const parts = (file.path || file.name).split('/')
    let current = root

    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1
      let node = current.find(n => n.name === part)

      if (!node) {
        node = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          type: isFile ? 'file' : 'dir',
          size: isFile ? file.size : undefined,
          lang: isFile ? file.lang : undefined,
          children: isFile ? undefined : [],
        }
        current.push(node)
      }

      if (!isFile && node.children) {
        current = node.children
      }
    })
  })

  // Sort: dirs first, then files
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      .map(n => ({ ...n, children: n.children ? sortNodes(n.children) : undefined }))
  }

  return sortNodes(root)
}

export interface Snippet {
  id: string
  name: string
  lang: string
  description: string
  code: string
  tags: string[]
  codeHash: string
  timestamp: string
  size: string
  views: number
  copies: number
  files?: FileEntry[]
  is_private?: boolean
}

export async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(code)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function registerSnippetOnChain(
  signAndSubmitTransaction: (payload: any) => Promise<any>
): Promise<void> {
  const payload = {
    data: {
      function: '0x1::aptos_account::transfer' as `${string}::${string}::${string}`,
      functionArguments: ['0x1', '0'],
    },
  }
  await signAndSubmitTransaction(payload)
}
