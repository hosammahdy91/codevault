import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { WalletSelector } from '@aptos-labs/wallet-adapter-ant-design'

interface Props { onProfile: () => void; onExplore: () => void; onHome: () => void; currentPage: string }

export function Navbar({ onProfile, onExplore, onHome, currentPage }: Props) {
  const { account, connected, disconnect, network } = useWallet()
  const shortAddr = (a: string) => a.slice(0, 6) + '...' + a.slice(-4)
  return (
    <header className="navbar">
      <div className="navbar-logo" onClick={onHome} style={{cursor:'pointer'}}>
        <span className="logo-hex">⬡</span>
        <span className="logo-text">Code<em>Vault</em></span>
        <span className="logo-tag">beta</span>
      </div>
      {connected && (
        <nav style={{display:'flex',gap:'4px'}}>
          <button className={'nav-link'+(currentPage==='home'?' active':'')} onClick={onHome}>Home</button>
          <button className={'nav-link'+(currentPage==='explore'?' active':'')} onClick={onExplore}>Explore</button>
          <button className={'nav-link'+(currentPage==='profile'?' active':'')} onClick={onProfile}>Profile</button>
        </nav>
      )}
      <div className="navbar-right">
        {connected && account ? (
          <>
            <div className="wallet-chip"><div className="wallet-dot" />{shortAddr(account.address.toString())}<span className="network-tag">{network?.name ?? 'Testnet'}</span></div>
            <button className="btn btn-ghost-red" onClick={disconnect}>Disconnect</button>
          </>
        ) : <WalletSelector />}
      </div>
    </header>
  )
}
