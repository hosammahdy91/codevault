import { useState, useEffect } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { ConnectScreen } from './components/ConnectScreen'
import { Dashboard } from './components/Dashboard'
import { Navbar } from './components/Navbar'
import { type Snippet } from './lib/aptos'

const STORAGE_KEY = 'codevault_snippets'

export default function App() {
  const { connected } = useWallet()

  const [snippets, setSnippets] = useState<Snippet[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // save to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets))
  }, [snippets])

  const addSnippet = (s: Snippet) => setSnippets(prev => [s, ...prev])

  return (
    <div className="app">
      <Navbar />
      {connected
        ? <Dashboard snippets={snippets} onPublish={addSnippet} />
        : <ConnectScreen />}
    </div>
  )
}
