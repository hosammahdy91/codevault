import { useState, useEffect } from 'react'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { getComments, addComment, deleteComment, getProfile, type Comment } from '../lib/supabase'

interface Props {
  projectId: string
}

export function CommentsSection({ projectId }: Props) {
  const { account } = useWallet()
  const wallet = account?.address.toString() ?? ''
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    getComments(projectId).then(data => {
      setComments(data)
      setLoading(false)
    })
  }, [projectId])

  async function postComment() {
    if (!text.trim() || !wallet) return
    setPosting(true)
    const profile = await getProfile(wallet)
    const comment: Comment = {
      project_id: projectId,
      wallet_address: wallet,
      username: profile?.username ?? wallet.slice(0,6) + '...' + wallet.slice(-4),
      avatar_url: profile?.avatar_url,
      content: text.trim(),
    }
    const saved = await addComment(comment)
    if (saved) setComments(prev => [...prev, saved])
    setText('')
    setPosting(false)
  }

  async function handleDelete(id: string) {
    await deleteComment(id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  const shortAddr = (a: string) => a.slice(0, 6) + '...' + a.slice(-4)

  return (
    <div className="comments-section">
      <div className="comments-header">
        <span className="section-title">Comments</span>
        <span className="comments-count">{comments.length}</span>
      </div>

      {loading ? (
        <div className="profile-loading" style={{padding:'20px'}}>Loading...</div>
      ) : comments.length === 0 ? (
        <div className="comments-empty">No comments yet. Be the first!</div>
      ) : (
        <div className="comments-list">
          {comments.map(c => (
            <div key={c.id} className="comment-item">
              <div className="comment-avatar">
                {c.avatar_url
                  ? <img src={c.avatar_url} alt="" className="comment-avatar-img" />
                  : <div className="comment-avatar-placeholder">
                      {(c.username ?? c.wallet_address).slice(0,2).toUpperCase()}
                    </div>
                }
              </div>
              <div className="comment-body">
                <div className="comment-meta">
                  <span className="comment-author">{c.username ?? shortAddr(c.wallet_address)}</span>
                  <span className="comment-time">{c.created_at?.slice(0,10)}</span>
                  {c.wallet_address === wallet && (
                    <button className="comment-delete" onClick={() => handleDelete(c.id!)}>×</button>
                  )}
                </div>
                <div className="comment-content">{c.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {wallet && (
        <div className="comment-input-wrap">
          <input
            className="field-input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Write a comment..."
            onKeyDown={e => e.key === 'Enter' && postComment()}
            disabled={posting}
          />
          <button
            className="btn btn-acid"
            onClick={postComment}
            disabled={posting || !text.trim()}
            style={{flexShrink:0}}
          >
            {posting ? '...' : 'Post'}
          </button>
        </div>
      )}
    </div>
  )
}
