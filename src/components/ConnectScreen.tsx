import { WalletSelector } from '@aptos-labs/wallet-adapter-ant-design'
import '@aptos-labs/wallet-adapter-ant-design/dist/index.css'

export function ConnectScreen() {
  return (
    <div className="connect-screen">
      <div className="connect-logo">⬡</div>
      <h1 className="connect-title">Code<em>Vault</em></h1>
      <p className="connect-sub">
        A decentralized code registry on Aptos. Every snippet you publish
        is registered on-chain — immutable, verifiable, permanent.
      </p>
      <div className="features-grid">
        {[
          { icon: '⬡', title: 'On-Chain Hash',  desc: 'SHA-256 of every file registered on Aptos Testnet.' },
          { icon: '⚡', title: 'Immutable',      desc: 'Transaction hash proves existence and timestamp.'    },
          { icon: '🔗', title: 'Permanent Link', desc: 'Every snippet linked to its Aptos Explorer tx.'     },
        ].map(f => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>
      <WalletSelector />
      <p className="wallet-hint">Supports Petra · Martian · Pontem · Rise</p>
    </div>
  )
}
