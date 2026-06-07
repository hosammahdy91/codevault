import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { WalletSelector } from '@aptos-labs/wallet-adapter-ant-design'

export function Navbar() {
  const { account, connected, disconnect, network } = useWallet()
  const shortAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`

  return (
    <header className="navbar">
      <div className="navbar-logo">
        <span className="logo-hex">⬡</span>
        <span className="logo-text">Code<em>Vault</em></span>
        <span className="logo-tag">beta</span>
      </div>
      <div className="navbar-right">
        {connected && account ? (
          <>
            <div className="wallet-chip">
              <div className="wallet-dot" />
              {shortAddr(account.address.toString())}
              <span className="network-tag">{network?.name ?? 'Testnet'}</span>
            </div>
            <button className="btn btn-ghost-red" onClick={disconnect}>
              Disconnect
            </button>
          </>
        ) : (
          <WalletSelector />
        )}
      </div>
    </header>
  )
}
