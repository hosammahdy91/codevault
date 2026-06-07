import { useState, useEffect } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { ConnectScreen } from './components/ConnectScreen'
import { Dashboard } from './components/Dashboard'
import { Navbar } from './components/Navbar'
import { ProfilePage } from './components/ProfilePage'
import { ExplorePage } from './components/ExplorePage'
import { type Snippet } from './lib/aptos'

const STORAGE_KEY = 'codevault_snippets'
type Page = 'home' | 'profile' | 'explore'

export default function App() {
  const { connected } = useWallet()
  const [page, setPage] = useState<Page>('home')
  const [snippets, setSnippets] = useState<Snippet[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets))
  }, [snippets])

  const addSnippet = (s: Snippet) => setSnippets(prev => [s, ...prev])

  return (
    <div className="app">
      <Navbar
        onProfile={() => setPage('profile')}
        onExplore={() => setPage('explore')}
        onHome={() => setPage('home')}
        currentPage={page}
      />
      {!connected ? <ConnectScreen /> :
       page === 'profile' ? <ProfilePage onBack={() => setPage('home')} /> :
       page === 'explore' ? <ExplorePage onBack={() => setPage('home')} /> :
       <Dashboard snippets={snippets} onPublish={addSnippet} />}
    </div>
  )
}
