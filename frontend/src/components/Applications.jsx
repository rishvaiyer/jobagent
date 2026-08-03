import { useState, useEffect } from 'react'
import { api } from '../api.js'

const STATUS_TAG = {
  draft: ['flag', 'draft'], submitted: ['good', 'applied'],
  interviewing: ['pop', 'interviewing'], offer: ['good', 'offer'], rejected: ['flag', 'rejected'],
}

export default function Applications({ ctx }) {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  function load() {
    api.getApplications().then(setApps).catch(e => ctx.toast(e.message, 'error')).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [ctx.refreshKey])

  async function approve(id) {
    setBusy(id)
    try { const r = await api.approveApplication(id); ctx.toast(r.note || 'Marked applied'); load(); ctx.bump() }
    catch (e) { ctx.toast(e.message, 'error') } finally { setBusy(null) }
  }

  return (
    <div className="wrap">
      <div className="head">
        <div className="eyebrow">Applications</div>
        <h2>Your pipeline</h2>
        <p>{apps.length} verified application{apps.length === 1 ? '' : 's'} tracked</p>
      </div>

      {loading ? <div className="loading">Loading…</div> : apps.length === 0 ? (
        <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>No applications yet</h3>
          <p className="muted sm">Draft one from the Jobs tab.</p>
        </div>
      ) : (
        apps.map(a => <ApplicationCard key={a.id} app={a} busy={busy} approve={approve} ctx={ctx} onSaved={load} />)
      )}
    </div>
  )
}

function ApplicationCard({ app: a, busy, approve, ctx, onSaved }) {
  const [coverLetter, setCoverLetter] = useState(a.draft_cover_letter || '')
  const [notes, setNotes] = useState(a.draft_notes || '')
  const [saving, setSaving] = useState(false)
  const [cls, lbl] = STATUS_TAG[a.status] || ['', a.status]

  async function save() {
    setSaving(true)
    try {
      const r = await api.updateApplicationDraft(a.id, { cover_letter: coverLetter, notes })
      ctx.toast(r.note || 'Application draft saved')
      onSaved()
    } catch (e) { ctx.toast(e.message, 'error') } finally { setSaving(false) }
  }

  async function setStatus(status) {
    setSaving(true)
    try {
      const r = await api.updateApplicationStatus(a.id, status)
      ctx.toast(r.note || 'Application status updated')
      onSaved()
      ctx.bump()
    } catch (e) { ctx.toast(e.message, 'error') } finally { setSaving(false) }
  }

  return (
    <div className="panel jcard">
      <div className="j-top">
        <div>
          <div className="j-title">{a.job_title}</div>
          <div className="j-sub">{a.job_company}</div>
        </div>
        {a.status === 'draft'
          ? <button className="btn good sm" disabled={busy === a.id || saving} onClick={() => approve(a.id)}>{busy === a.id ? '…' : 'Approve & apply'}</button>
          : <span className={`tag ${cls}`}>{lbl}</span>}
      </div>
      <div className="j-meta">
        {a.status === 'draft' && <span className={`tag ${cls}`}>{lbl}</span>}
        <span className="tag">{a.apply_method === 'email' ? 'email apply' : 'web apply'}</span>
        {a.mode && <span className="tag">{a.mode}</span>}
        {a.job_location && <span className="tag">{a.job_location}</span>}
        {a.job_url && <a className="text-action" href={a.job_url} target="_blank" rel="noreferrer">View role</a>}
        <select className="status-select" value={a.status} disabled={saving} onChange={e => setStatus(e.target.value)}>
          <option value="draft">Draft</option>
          <option value="submitted">Applied</option>
          <option value="interviewing">Interviewing</option>
          <option value="offer">Offer</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {a.status === 'draft' ? (
        <div className="draft-card" style={{ marginTop: 14 }}>
          <label className="s-label" htmlFor={`cover-${a.id}`}>Cover letter</label>
          <textarea id={`cover-${a.id}`} className="sinput draft-editor" value={coverLetter} onChange={e => setCoverLetter(e.target.value)} />
          <label className="s-label" htmlFor={`notes-${a.id}`}>Tailoring notes</label>
          <textarea id={`notes-${a.id}`} className="sinput notes-editor" value={notes} onChange={e => setNotes(e.target.value)} />
          <div className="actions"><button className="btn sm" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save edits'}</button></div>
        </div>
      ) : a.draft_cover_letter && (
        <div className="draft-card" style={{ marginTop: 14 }}><div className="draft-pre">{a.draft_cover_letter}</div></div>
      )}
      {a.status !== 'draft' && a.draft_notes && <div className="j-reason">Notes: {a.draft_notes}</div>}
      {a.status === 'submitted' && a.apply_method === 'email' && (
        <div className="notice">
          {a.gmail_draft_id
            ? <><b>Gmail draft created</b> for you to review and send — nothing was sent automatically.</>
            : <><b>Email-apply role:</b> review the cover letter above and send it yourself.</>}
        </div>
      )}
    </div>
  )
}
