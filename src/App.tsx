import { useState, useEffect } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { ConnectScreen } from './components/ConnectScreen'
import { Dashboard } from './components/Dashboard'
import { Navbar } from './components/Navbar'
import { ProfilePage } from './components/ProfilePage'
import { ExplorePage } from './components/ExplorePage'
import { ProjectPage } from './components/ProjectPage'
import { type Snippet } from './lib/aptos'
import { type Project } from './lib/supabase'

const STORAGE_KEY = 'codevault_snippets'
type Page = 'home' | 'profile' | 'explore' | 'view-profile' | 'project'

export default function App() {
  const { connected } = useWallet()
  const [page, setPage] = useState<Page>('home')
  const [viewWallet, setViewWallet] = useState<string | undefined>()
  const [viewProject, setViewProject] = useState<Project | undefined>()

  const [snippets, setSnippets] = useState<Snippet[]>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : [] } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets))
  }, [snippets])

  const addSnippet = (s: Snippet) => setSnippets(prev => [s, ...prev])

  function handleViewProfile(wallet: string) {
    setViewWallet(wallet)
    setPage('view-profile')
  }

  function handleViewProject(p: Project) {
    setViewProject(p)
    setPage('project')
  }

  return (
    <div className="app">
      <Navbar
        onProfile={() => setPage('profile')}
        onExplore={() => setPage('explore')}
        onHome={() => setPage('home')}
        currentPage={page}
      />
      {!connected ? <ConnectScreen /> :
       page === 'profile'      ? <ProfilePage onBack={() => setPage('home')} /> :
       page === 'view-profile' ? <ProfilePage onBack={() => setPage('explore')} viewWallet={viewWallet} /> :
       page === 'project'      ? <ProjectPage project={viewProject!} onBack={() => setPage('explore')} onViewProfile={handleViewProfile} /> :
       page === 'explore'      ? <ExplorePage onBack={() => setPage('home')} onViewProfile={handleViewProfile} onViewProject={handleViewProject} /> :
       <Dashboard snippets={snippets} onPublish={addSnippet} />}
    </div>
  )
}
