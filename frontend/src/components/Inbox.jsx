import { useState, useEffect } from 'react'
import { api } from '../api.js'

const CAT_TAG = {
  recruiter: ['pop', 'Recruiter'], interview: ['pop', 'Interview'],
  offer: ['good', 'Offer'], rejection: ['flag', 'Rejection'],
  application_update: ['', 'Update'], other: ['', 'Email'],
}
const FILTERS = [['all', 'All'], ['needs', 'Needs reply'], ['recruiter', 'Recruiters'], ['interview', 'Interviews']]

export default function Inbox({ ctx }) {
  const [threads, setThreads] = useState([])
  const [selId, setSelId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [mobileDetail, setMobileDetail] = useState(false)
  const [busy, setBusy] = useState(null)
  const [draftText, setDraftText] = useState('')

  function load(keepSel = true) {
    api.getInbox().then(t => {
      setThreads(t)
      if (!keepSel || selId == null) setSelId(t[0]?.id ?? null)
    }).catch(e => ctx.toast(e.message, 'error'))
  }
  useEffect(() => { load(false) }, [ctx.refreshKey])

  async function scan() {
    setBusy('scan')
    try { const r = await api.scanInbox(); ctx.toast(r.summary); load(false); ctx.bump() }
    catch (e) { ctx.toast(e.message, 'error') } finally { setBusy(null) }
  }

  async function act(id, label, fn, msg) {
    setBusy(label)
    try { const r = await fn(id); ctx.toast(typeof r?.note === 'string' ? r.note : msg); load(); ctx.bump() }
    catch (e) { ctx.toast(e.message, 'error') } finally { setBusy(null) }
  }

  const shown = threads.filter(t =>
    filter === 'all' ? true : filter === 'needs' ? t.needs_response : t.category === filter)
  const sel = threads.find(t => t.id === selId)
  useEffect(() => { setDraftText(sel?.draft?.draft_text || '') }, [selId, sel?.draft?.id])

  async function saveDraft() {
    if (!sel) return
    setBusy('save')
    try { const r = await api.updateReplyDraft(sel.id, draftText); ctx.toast(r.note || 'Reply draft saved'); load() }
    catch (e) { ctx.toast(e.message, 'error') } finally { setBusy(null) }
  }

  async function sendReviewed() {
    if (!sel) return
    setBusy('send')
    try {
      await api.updateReplyDraft(sel.id, draftText)
      const r = await api.sendReply(sel.id)
      ctx.toast(r.note || (r.sent ? 'Sent' : 'Marked sent locally'))
      load(); ctx.bump()
    } catch (e) { ctx.toast(e.message, 'error') } finally { setBusy(null) }
  }

  return (
    <div className={`inbox ${mobileDetail ? 'show-detail' : 'show-list'}`}>
      <div className="threads">
        <div className="threads-head">
          <h3>Inbox</h3>
          <div className="filters">
            {FILTERS.map(([id, lbl]) => (
              <button key={id} className={`chip ${filter === id ? 'on' : ''}`} onClick={() => setFilter(id)}>{lbl}</button>
            ))}
          </div>
          <button className="btn solid sm" style={{ marginTop: 12 }} disabled={busy === 'scan'} onClick={scan}>
            {busy === 'scan' ? 'Scanning…' : 'Scan inbox'}
          </button>
        </div>
        {shown.length === 0 ? (
          <div className="empty">Nothing here. Click “Scan inbox”.</div>
        ) : shown.map(t => {
          const [cls, lbl] = CAT_TAG[t.category] || ['', t.category]
          return (
            <div key={t.id} className={`thread ${t.id === selId ? 'active' : ''}`}
              onClick={() => { setSelId(t.id); setMobileDetail(true) }}>
              <div className="t-top"><span className="name">{(t.sender || '').split('<')[0].trim() || 'Unknown'}</span></div>
              <div className="prev">{t.subject}</div>
              <div className="t-meta">
                {lbl && <span className={`tag ${cls}`}>{lbl}</span>}
                {t.needs_response && <span className="tag flag">needs reply</span>}
                {t.draft && t.draft.status !== 'sent' && <span className="tag good">draft</span>}
                {t.draft && t.draft.status === 'sent' && <span className="tag">sent</span>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="detail">
        {!sel ? (
          <div className="empty">Select a conversation.</div>
        ) : (
          <>
            <button className="btn sm mobile-back" onClick={() => setMobileDetail(false)}>← Inbox</button>
            <div className="d-head">
              <div>
                <h2>{sel.subject}</h2>
                <p className="muted sm" style={{ marginTop: 6 }}>{sel.sender}</p>
              </div>
            </div>
            <div className="convo">
              <div className="msg them"><div className="bubble">{sel.body || sel.snippet}</div></div>
            </div>

            {sel.draft ? (
              <div className="draft-card">
                <div className="reason">
                  {sel.draft.status === 'sent'
                    ? <span className="tag good">sent</span>
                    : <span className="tag">Suggested reply · {sel.draft.confidence || 'draft'} confidence</span>}
                </div>
                {sel.draft.status === 'sent'
                  ? <div className="draft-pre">{sel.draft.draft_text}</div>
                  : <textarea className="sinput draft-editor" aria-label="Reply draft" value={draftText} onChange={e => setDraftText(e.target.value)} />}
                {sel.draft.reason && <p className="reason" style={{ marginTop: 12 }}>{sel.draft.reason}</p>}
                {sel.draft.status !== 'sent' && (
                  <div className="actions">
                    <button className="btn good" disabled={busy === 'send' || busy === 'save'} onClick={sendReviewed}>
                      {busy === 'send' ? '…' : 'Approve & send'}
                    </button>
                    <button className="btn" disabled={busy === 'save' || busy === 'send'} onClick={saveDraft}>{busy === 'save' ? 'Saving…' : 'Save edits'}</button>
                    <button className="btn" disabled={busy === 'redraft'} onClick={() => act(sel.id, 'redraft', api.draftReply, 'Redrafted')}>Redraft</button>
                  </div>
                )}
                <div className="notice" style={{ marginTop: 14 }}>
                  Drafts are never sent on their own. {sel.draft.gmail_draft_id ? 'This was saved to your Gmail Drafts.' : 'Gmail isn’t connected, so this lives locally only.'}
                </div>
              </div>
            ) : (
              <div className="draft-card">
                <p className="muted sm">No draft yet.</p>
                {sel.needs_response && (
                  <div className="actions">
                    <button className="btn primary" disabled={busy === 'draft'} onClick={() => act(sel.id, 'draft', api.draftReply, 'Draft ready')}>
                      {busy === 'draft' ? 'Drafting…' : 'Draft reply'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
