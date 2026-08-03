import { useState, useEffect } from 'react'
import { api } from '../api.js'

export default function Jobs({ ctx }) {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  function load() {
    api.getJobs().then(setJobs).catch(e => ctx.toast(e.message, 'error')).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [ctx.refreshKey])

  async function act(id, label, fn, msg) {
    setBusy(`${id}:${label}`)
    try { await fn(id); ctx.toast(msg); load(); ctx.bump() }
    catch (e) { ctx.toast(e.message, 'error') } finally { setBusy(null) }
  }

  const visible = jobs.filter(j => j.status !== 'dismissed')

  return (
    <div className="wrap">
      <div className="head">
        <div className="eyebrow">Jobs</div>
        <h2>Matched roles</h2>
        <p>{visible.length} jobs · ranked by fit to your profile</p>
      </div>

      <div className="actions-bar">
        <button className="btn solid" disabled={busy === 'find'} onClick={async () => {
          setBusy('find')
          try { const r = await api.findJobs(); ctx.toast(r.summary); load(); ctx.bump() }
          catch (e) { ctx.toast(e.message, 'error') } finally { setBusy(null) }
        }}>{busy === 'find' ? 'Searching…' : 'Find jobs'}</button>
      </div>

      {loading ? <div className="loading">Loading…</div> : visible.length === 0 ? (
        <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>No jobs yet</h3>
          <p className="muted sm">Click “Find jobs” — the agent searches based on your profile (Settings).</p>
        </div>
      ) : (
        visible.map(j => (
          <div className="panel jcard" key={j.id}>
            <div className="j-top">
              <div>
                <div className="j-title">{j.title}</div>
                <div className="j-sub">{j.company} · {j.location || 'location n/a'}{j.salary ? ` · ${j.salary}` : ''}</div>
              </div>
              <div className="score">{j.match_score}%</div>
            </div>
            {j.match_reason && <div className="j-reason">{j.match_reason}</div>}
            {j.description && <div className="j-desc">{j.description}</div>}
            <div className="j-meta">
              <span className="tag">{j.apply_method === 'email' ? 'email apply' : 'web apply'}</span>
              {j.status === 'applied' && <span className="tag good">applied</span>}
              {j.status === 'saved' && <span className="tag pop">saved</span>}
              {j.source && <span className="tag">{j.source}</span>}
            </div>
            <div className="actions">
              {j.url && <a className="btn sm" href={j.url} target="_blank" rel="noreferrer">View listing</a>}
              <button className="btn primary sm" disabled={busy === `${j.id}:draft`}
                onClick={() => act(j.id, 'draft', api.draftApplication, 'Application drafted — see Applications')}>
                {busy === `${j.id}:draft` ? 'Drafting…' : 'Draft application'}
              </button>
              {j.status !== 'saved' && j.status !== 'applied' && (
                <button className="btn sm" onClick={() => act(j.id, 'save', api.saveJob, 'Saved')}>Save</button>
              )}
              <button className="btn danger sm" onClick={() => act(j.id, 'dismiss', api.dismissJob, 'Dismissed')}>Dismiss</button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
