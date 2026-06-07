import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'

export const aptosClient = new Aptos(
  new AptosConfig({ network: Network.TESTNET })
)

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
}

export async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(code)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function registerSnippetOnChain(
  signAndSubmitTransaction: (payload: any) => Promise<any>,
  snippet: { name: string; lang: string; description: string; codeHash: string }
): Promise<void> {
  const payload = {
    data: {
      function: '0x1::aptos_account::transfer' as `${string}::${string}::${string}`,
      functionArguments: ['0x1', '0'],
    },
  }
  await signAndSubmitTransaction(payload)
}
