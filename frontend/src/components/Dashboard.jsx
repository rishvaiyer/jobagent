import { useState, useEffect } from 'react'
import { api } from '../api.js'
import { Icon } from '../icons.jsx'

const CAT_TAG = {
  recruiter: ['pop', 'Recruiter'], interview: ['pop', 'Interview'],
  offer: ['good', 'Offer'], rejection: ['flag', 'Rejection'],
  application_update: ['', 'Update'], other: ['', 'Email'],
}

export default function Dashboard({ ctx }) {
  const [data, setData] = useState(null)
  const [inbox, setInbox] = useState([])
  const [followups, setFollowups] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  function load() {
    Promise.all([api.dashboard(), api.getInbox(), api.getFollowups()])
      .then(([d, i, f]) => { setData(d); setInbox(i); setFollowups(f.filter(x => x.status === 'open')) })
      .catch(e => ctx.toast(e.message, 'error'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [ctx.refreshKey])

  async function run(label, fn) {
    setBusy(label)
    try { const r = await fn(); ctx.toast(r.summary || 'Done'); load(); ctx.bump() }
    catch (e) { ctx.toast(e.message, 'error') } finally { setBusy(null) }
  }

  async function completeFollowup(id) {
    setBusy(`followup:${id}`)
    try { await api.completeFollowup(id); ctx.toast('Follow-up completed'); load(); ctx.bump() }
    catch (e) { ctx.toast(e.message, 'error') } finally { setBusy(null) }
  }

  if (loading) return <div className="wrap"><div className="loading">Loading dashboard…</div></div>

  const a = data?.applications || {}
  const needs = inbox.filter(t => t.needs_response)

  const greeting = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  }

  return (
    <div className="wrap">
      <div className="head">
        <div className="eyebrow">Overview</div>
        <h2>{greeting()}</h2>
        <p>{data.jobs_found} open jobs · {needs.length} emails need a reply · {data.open_followups} open follow-ups</p>
      </div>

      <div className="actions-bar">
        <button className="btn solid" disabled={busy === 'find'} onClick={() => run('find', api.findJobs)}>
          {busy === 'find' ? 'Searching…' : 'Find jobs'}
        </button>
        <button className="btn" disabled={busy === 'scan'} onClick={() => run('scan', api.scanInbox)}>
          {busy === 'scan' ? 'Scanning…' : 'Scan inbox'}
        </button>
        <button className="btn" disabled={busy === 'reply'} onClick={() => run('reply', api.draftReplies)}>
          {busy === 'reply' ? 'Drafting…' : 'Draft replies'}
        </button>
      </div>

      <div className="stat-row">
        <Tile icon="jobs" label="Open jobs" n={data.jobs_found} pop cap="matched to your profile" />
        <Tile icon="applications" label="App drafts" n={a.draft || 0} cap="ready to review" />
        <Tile icon="check" label="Applied" n={a.submitted || 0} cap="submitted by you" />
        <Tile icon="bell" label="Needs reply" n={needs.length} cap="emails waiting" />
      </div>

      <div className="dash-cols">
        <div className="panel">
          <div className="panel-h"><h3>Inbox — needs a reply</h3><span className="more" onClick={() => ctx.go('inbox')}>Open inbox →</span></div>
          {needs.length ? needs.map(t => {
            const [cls, lbl] = CAT_TAG[t.category] || ['', t.category]
            return (
              <div key={t.id} className="lrow" onClick={() => ctx.go('inbox')}>
                <div className="lr-body">
                  <div className="lr-top">
                    <span className="lr-name">{t.subject}</span>
                  </div>
                  <div className="lr-prev">{t.sender}</div>
                  <div className="lr-meta">
                    {lbl && <span className={`tag ${cls}`}>{lbl}</span>}
                    {t.draft && <span className="tag good">draft ready</span>}
                  </div>
                </div>
              </div>
            )
          }) : <div className="empty-row">Inbox is clear. Run “Scan inbox” to pull job-related email.</div>}
        </div>

        <div>
          <div className="panel">
            <div className="panel-h"><h3>Open follow-ups</h3></div>
            {followups.length ? followups.slice(0, 5).map(f => (
              <div key={f.id} className="lrow">
                <div className="lr-body">
                  <div className="lr-name" style={{ fontSize: 12.5 }}>{f.task_text}</div>
                  <div className="lr-meta">
                    <span className="dir">{f.direction === 'you_owe' ? 'you owe' : 'they owe'}</span>
                    <button className="text-action" disabled={busy === `followup:${f.id}`} onClick={() => completeFollowup(f.id)}>
                      {busy === `followup:${f.id}` ? '…' : 'Done'}
                    </button>
                  </div>
                </div>
              </div>
            )) : <div className="empty-row">No open items</div>}
          </div>

          <div className="panel">
            <div className="panel-h"><h3>Recent agent runs</h3></div>
            {(data.recent_runs || []).length ? data.recent_runs.map((r, i) => (
              <div key={i} className="lrow">
                <div className="lr-body">
                  <div className="lr-name" style={{ fontSize: 12.5 }}>{r.summary}</div>
                  <div className="lr-meta"><span className="tag">{r.mode}</span></div>
                </div>
              </div>
            )) : <div className="empty-row">No runs yet</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function Tile({ icon, label, n, pop, cap }) {
  return (
    <div className="tile">
      <div className="k"><Icon name={icon} /> {label}</div>
      <div className={`n${pop ? ' pop' : ''}`}>{n}</div>
      <div className="cap">{cap}</div>
    </div>
  )
}
