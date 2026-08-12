import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'

export const WORKFLOW_TABS = [
  ['ready_for_review', 'Ready for your review'],
  ['needs_preparation', 'Needs preparation'],
  ['needs_user_review', 'Needs your review'],
  ['approved_queued', 'Submission queue'],
  ['submitting', 'Submitting'],
  ['applied', 'Applied history'],
  ['archived', 'Archived'],
]

const SKILL_CATEGORIES = [
  ['technical', 'Technical'],
  ['applied_ai', 'Applied AI'],
  ['business_delivery', 'Business and delivery'],
  ['role_specific', 'Role-specific'],
]

function openReviewItems(application) {
  if (['applied', 'archived'].includes(application?.workflow_state)) return []
  return (application?.review_items || []).filter((item) => !(item.answer || '').trim())
}

function workflowTab(application) {
  if (openReviewItems(application).length) return 'needs_user_review'
  return WORKFLOW_TABS.some(([id]) => id === application?.workflow_state) ? application.workflow_state : 'needs_preparation'
}

export function workflowCounts(applications) {
  return WORKFLOW_TABS.reduce((counts, [id]) => ({ ...counts, [id]: applications.filter((application) => workflowTab(application) === id).length }), {})
}

function reviewGroups(applications) {
  const groups = new Map()
  applications.forEach((application) => openReviewItems(application).forEach((item) => {
    const group = groups.get(item.item_key) || { item, applications: [] }
    group.applications.push(application)
    groups.set(item.item_key, group)
  }))
  return [...groups.values()]
}

export function reviewGroupCount(applications) {
  return reviewGroups(applications).length
}

function replaceApplication(applications, updated) {
  return applications.map((application) => application.id === updated.id ? updated : application)
}

function summaryText(summary) {
  if (summary && typeof summary === 'object') return Object.entries(summary).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${value}`).join(' · ')
  return summary || 'No summary recorded.'
}

export function WorkflowDashboard({ applications, counts, runs, onGo }) {
  const latest = runs[0]
  return <section>
    <div className="section-head dashboard-heading"><div><div className="eyebrow">PRIVACY-SAFE PUBLIC DEMO</div><h1>Know what happens next.</h1><p className="lede">A complete application workflow with synthetic records only. Applied means a mock employer or ATS receipt exists.</p></div><button className="button primary dashboard-action" onClick={() => onGo('activity')}>Open activity →</button></div>
    <div className="metric-grid">
      <div className="metric-card"><strong>{applications.length}</strong><b>Tracked applications</b><small>All records are fictional</small></div>
      <div className="metric-card accent"><strong>{counts.ready_for_review || 0}</strong><b>Ready for review</b><small>Prepared, not approved</small></div>
      <div className="metric-card"><strong>{counts.approved_queued || 0}</strong><b>Submission queue</b><small>Approved, not yet applied</small><button onClick={() => onGo('submission_queue')}>Open queue →</button></div>
      <div className="metric-card"><strong>{counts.applied || 0}</strong><b>Confirmed applied</b><small>Mock receipt present</small></div>
    </div>
    <div className="dashboard-grid">
      <section className="workflow-panel"><div className="section-head"><div><div className="eyebrow">CURRENT WORKLOAD</div><h2>Application flow</h2><p>Each record has one truthful state.</p></div><button className="button secondary" onClick={() => onGo('applications')}>Open applications →</button></div><div className="funnel">{WORKFLOW_TABS.map(([id, label]) => <div className="funnel-row" key={id}><span>{label}</span><div><i style={{ width: `${Math.min(100, (counts[id] || 0) * 28)}%` }} /></div><b>{counts[id] || 0}</b></div>)}</div><div className="truth-gate"><b>Receipt gate is active</b><span>Queue progress cannot mark an application Applied. A visible confirmation is required.</span></div></section>
      {latest && <aside className="workflow-panel latest-run"><div className="latest-run-head"><div className="eyebrow">LATEST RUN</div><span className="run-state">{latest.state}</span></div><h2>{latest.kind}</h2><small>{latest.created_at}</small><p>{summaryText(latest.summary)}</p><button className="button secondary" onClick={() => onGo('activity')}>Open activity log →</button></aside>}
    </div>
  </section>
}

export function WorkflowApplications({ applications, counts, onUpdate, toast }) {
  const [filter, setFilter] = useState('ready_for_review')
  const [busy, setBusy] = useState('')
  const visible = applications.filter((application) => workflowTab(application) === filter)

  async function act(application, action) {
    setBusy(application.id)
    try {
      const updated = await (action === 'approve' ? api.approveApplication(application.id) : api.denyApplication(application.id))
      onUpdate((current) => replaceApplication(current, updated))
      toast(action === 'approve' ? (workflowTab(updated) === 'needs_user_review' ? 'Approved. One mock answer is still required.' : 'Approved and added to the mock submission queue.') : 'Moved to the mock archive.')
    } catch (error) { toast(error.message, 'error') } finally { setBusy('') }
  }

  return <section>
    <div className="eyebrow">APPLICATIONS</div><h1>One record. One state.</h1><p className="lede">Review the posting, resume, requirements, and gate status together. Every company, role, and document shown here is synthetic.</p>
    <div className="tab-strip">{WORKFLOW_TABS.map(([id, label]) => <button key={id} className={filter === id ? 'selected' : ''} onClick={() => setFilter(id)}>{label}<b>{counts[id] || 0}</b></button>)}</div>
    <div className="cards">{visible.length ? visible.map((application) => <ApplicationCard key={application.id} application={application} busy={busy === application.id} approve={() => act(application, 'approve')} deny={() => act(application, 'deny')} />) : <div className="empty">Nothing in <b>{WORKFLOW_TABS.find(([id]) => id === filter)?.[1]}</b>.</div>}</div>
  </section>
}

function ApplicationCard({ application, busy, approve, deny }) {
  const job = application.job || {}
  const requirements = (job.requirements || []).slice(0, 4)
  const canDeny = !['approved_queued', 'submitting', 'applied', 'archived'].includes(application.workflow_state)
  return <article className="application-card packet-card">
    <div className="card-top"><span className="state-pill">{workflowTab(application).replaceAll('_', ' ')}</span><span>{application.match_score}% mock match</span></div>
    <h2>{job.title}</h2><p className="company">{job.company} · {job.location}</p>
    <div className="packet-grid">
      <section className="packet-cell"><span>Posting</span><a href={job.url} target="_blank" rel="noreferrer">Open demo posting ↗</a><small className="configured">{job.posting_label}</small></section>
      <section className="packet-cell"><span>Resume</span><b>{application.selected_resume?.is_main ? '★ ' : ''}{application.selected_resume?.title || 'Not attached'}</b><small>Mock PDF metadata</small></section>
      <section className="packet-cell packet-requirements"><span>Requirements</span><ul>{requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul></section>
      <section className="packet-cell"><span>Cover letter</span><b>{job.cover_letter_required ? application.cover_letter ? 'Prepared' : 'Required, not attached' : 'Not required'}</b><small>{job.cover_letter_required ? 'Synthetic text only' : 'Resume-only packet'}</small></section>
    </div>
    <details className="packet-detail"><summary>Full demo packet</summary><p>{job.description}</p>{application.cover_letter && <p><b>Mock cover letter:</b> {application.cover_letter}</p>}</details>
    {workflowTab(application) === 'ready_for_review' && <div className="button-row"><button className="button approve" disabled={busy} onClick={approve}>{busy ? 'Processing…' : 'Approve and queue'}</button>{canDeny && <button className="button danger" disabled={busy} onClick={deny}>Archive</button>}</div>}
    {workflowTab(application) === 'approved_queued' && <div className="queue-line"><strong>Approved, not yet applied.</strong> The demo requires a mock receipt before changing this state.</div>}
    {workflowTab(application) === 'applied' && <div className="confirmed-line">Confirmed: {application.submission_confirmation}</div>}
  </article>
}

export function SubmissionQueue({ applications, onGo }) {
  const queued = applications.filter((application) => workflowTab(application) === 'approved_queued')
  return <section><div className="section-head"><div><div className="eyebrow">SUBMISSION QUEUE</div><h1>Approved, not yet applied.</h1><p className="lede">Approval preserves a packet. Applied still requires visible confirmation, even in this mock workflow.</p></div><button className="button secondary" onClick={() => onGo('applications')}>Review applications →</button></div>
    <section className="queue-banner"><b>{queued.length} approved mock packet{queued.length === 1 ? '' : 's'} ready</b><span>Approval allows an attempt. It does not prove a submission.</span><div className="duplicate-gate"><span>Duplicate gate</span><b>On</b><small>Confirmed applications are not repeated.</small></div></section>
    <div className="cards queue-rows">{queued.length ? queued.map((application) => <article className="application-card packet-card queue-row" key={application.id}><div className="queue-role"><div className="card-top"><span className="state-pill">Awaiting submission</span><span>{application.match_score}% match</span></div><h2>{application.job.title}</h2><p className="company">{application.job.company} · {application.job.location}</p></div><section className="queue-row-cell"><span>Packet</span><b>{application.selected_resume?.title}</b></section><section className="queue-row-cell"><span>Gate</span><div className="truth-gate"><b>Receipt required</b><span>Confirmation moves this to Applied.</span></div></section><section className="queue-row-cell"><span>Posting</span><a href={application.job.url} target="_blank" rel="noreferrer">Open demo posting ↗</a></section></article>) : <div className="empty">No mock packets are waiting.</div>}</div>
  </section>
}

export function NeedsReview({ applications, onUpdate, toast }) {
  const groups = reviewGroups(applications)
  return <section><div className="eyebrow">YOUR DECISION REQUIRED</div><h1>Needs your review</h1><p className="lede">Answer once and reuse the response across matching records. The demo never invents preferences, eligibility, or employment history.</p><div className="cards">{groups.length ? groups.map((group) => <ReviewCard key={group.item.item_key} group={group} onUpdate={onUpdate} toast={toast} />) : <div className="empty">No blocked questions.</div>}</div></section>
}

function ReviewCard({ group, onUpdate, toast }) {
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!answer.trim()) return toast('Enter a mock answer first.', 'error')
    setBusy(true)
    try { const result = await api.answerReviewGlobal(group.item.item_key, answer.trim()); onUpdate((current) => result.applications.reduce(replaceApplication, current)); toast(`Saved for ${result.updated_count} mock application${result.updated_count === 1 ? '' : 's'}.`) } catch (error) { toast(error.message, 'error') } finally { setBusy(false) }
  }
  return <article className="application-card review-card review-answer"><div className="card-top"><span className="state-pill warning">Needs your review</span><span>{group.applications.length} matching applications</span></div><h2>{group.item.question}</h2><p className="company">{group.item.reason}</p><p className="company">{group.applications.map((application) => `${application.job.company} · ${application.job.title}`).join(' · ')}</p><div className="question"><label><span>Mock response</span><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type a synthetic answer" /></label><button className="button primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save once for all'}</button></div></article>
}

export function ResumeLibrary({ resumes, onUpdate, toast }) {
  const [view, setView] = useState('active')
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const active = resumes.filter((resume) => !resume.is_archived)
  const archived = resumes.filter((resume) => resume.is_archived)
  const visible = view === 'active' ? active : archived
  async function main(resume) { await api.setMainResume(resume.id); onUpdate((current) => current.map((item) => ({ ...item, is_main: item.id === resume.id }))); toast(`${resume.title} is now the mock default.`) }
  async function archive(resume) { const updated = await api.setResumeArchived(resume.id, !resume.is_archived); onUpdate((current) => current.map((item) => item.id === updated.id ? updated : item)); toast(updated.is_archived ? 'Moved to the mock archive.' : 'Restored to active mock resumes.') }
  async function add(event) { event.preventDefault(); const added = await api.addMockResume(title); onUpdate((current) => [added, ...current]); setAdding(false); setTitle(''); toast('Synthetic resume added in browser memory.') }
  return <section className="resume-library"><div className="section-head"><div><div className="eyebrow">RESUME LIBRARY</div><h1>Mock resumes</h1><p className="lede">Exercise main-resume and archive controls without uploading a real document.</p></div><button className="button primary" onClick={() => setAdding((value) => !value)}>{adding ? 'Cancel' : 'Add mock resume'}</button></div>
    {adding && <form className="controls resume-upload" onSubmit={add}><div className="eyebrow">ADD SYNTHETIC RESUME</div><label>Display title<input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Example: Frontend Engineer" /></label><button className="button primary">Add to demo</button></form>}
    <div className="tab-strip"><button className={view === 'active' ? 'selected' : ''} onClick={() => setView('active')}>Active <b>{active.length}</b></button><button className={view === 'archive' ? 'selected' : ''} onClick={() => setView('archive')}>Archive <b>{archived.length}</b></button></div>
    <div className="resume-grid">{visible.map((resume) => <article className={`application-card resume-card${resume.is_main ? ' main-resume' : ''}`} key={resume.id}><div className="pdf-tile" aria-hidden="true"><span>PDF</span><i /></div><div className="resume-card-body"><div className="card-top"><span className="state-pill">{resume.is_main ? '★ Main resume' : resume.is_archived ? 'Archived' : 'Resume'}</span><span className="configured">{resume.quality_label}</span></div><h2>{resume.title}</h2><p className="company">{resume.original_filename}</p><div className="card-meta"><span>{resume.is_ready ? 'Ready for mock packets' : 'Not ready'}</span></div><div className="button-row">{!resume.is_main && !resume.is_archived && <button className="button primary" onClick={() => main(resume)}>Make main</button>}{resume.is_main && <div className="confirmed-line">Default for new mock packets.</div>}{!resume.is_main && <button className="button quiet" onClick={() => archive(resume)}>{resume.is_archived ? 'Restore' : 'Archive'}</button>}</div></div></article>)}</div>
  </section>
}

function normalizeSkills(profile = {}) {
  const inventory = {}
  SKILL_CATEGORIES.forEach(([category]) => { inventory[category] = (profile.skills_inventory?.[category] || []).map((entry) => ({ ...entry })) })
  return { skills_inventory: inventory, skills_guardrails: [...(profile.skills_guardrails || [])] }
}

export function SkillsLibrary({ skills, onUpdate, toast }) {
  const [profile, setProfile] = useState(() => normalizeSkills(skills))
  useEffect(() => setProfile(normalizeSkills(skills)), [skills])
  const counts = useMemo(() => Object.values(profile.skills_inventory).flat().reduce((result, skill) => ({ total: result.total + 1, baseline: result.baseline + (skill.readiness === 'baseline' ? 1 : 0) }), { total: 0, baseline: 0 }), [profile])
  function edit(category, index, field, value) { setProfile((current) => ({ ...current, skills_inventory: { ...current.skills_inventory, [category]: current.skills_inventory[category].map((entry, entryIndex) => entryIndex === index ? { ...entry, [field]: value } : entry) } })) }
  function add(category) { setProfile((current) => ({ ...current, skills_inventory: { ...current.skills_inventory, [category]: [...current.skills_inventory[category], { name: '', evidence: '', readiness: category === 'role_specific' ? 'role_specific' : 'baseline' }] } })) }
  async function save() { const updated = await api.updateSkills(profile); onUpdate(updated); toast('Mock skills saved in browser memory.') }
  return <section className="skills-library"><div className="section-head"><div><div className="eyebrow">SKILLS</div><h1>Evidence-backed skills</h1><p className="lede">Every synthetic skill keeps its mock evidence attached so unsupported claims cannot enter a packet.</p></div><button className="button primary" onClick={save}>Save mock skills</button></div>
    <div className="hero-grid skill-stats"><div className="hero-card"><span>Verified skills</span><strong>{counts.total}</strong></div><div className="hero-card accent"><span>Baseline-ready</span><strong>{counts.baseline}</strong></div><div className="hero-card"><span>Role-specific</span><strong>{counts.total - counts.baseline}</strong></div></div>
    <div className="skill-groups">{SKILL_CATEGORIES.map(([category, label]) => <section className="application-card skill-panel" key={category}><div className="section-head"><div><h2>{label}</h2><p className="company">Synthetic evidence only.</p></div><button className="button secondary" onClick={() => add(category)}>Add skill</button></div><div className="skills-table">{profile.skills_inventory[category].map((entry, index) => <div className="skill-row" key={`${category}-${index}`}><label>Skill<input value={entry.name} onChange={(event) => edit(category, index, 'name', event.target.value)} /></label><label>Evidence<input value={entry.evidence} onChange={(event) => edit(category, index, 'evidence', event.target.value)} /></label><label>Use<select value={entry.readiness} onChange={(event) => edit(category, index, 'readiness', event.target.value)}><option value="baseline">Baseline-ready</option><option value="role_specific">Role-specific</option></select></label></div>)}</div></section>)}</div>
    <section className="application-card guardrail-panel"><h2>Claim guardrails</h2>{profile.skills_guardrails.map((guardrail, index) => <div className="guardrail-row" key={index}><input value={guardrail} onChange={(event) => setProfile((current) => ({ ...current, skills_guardrails: current.skills_guardrails.map((value, valueIndex) => valueIndex === index ? event.target.value : value) }))} /></div>)}</section>
  </section>
}

export function DemoSettings({ settings, onUpdate, toast }) {
  if (!settings) return <div className="loading">Loading settings…</div>
  async function save(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const updated = await api.updateSettings({ batch_size: Number(form.get('batch_size')), max_retries: Number(form.get('max_retries')) }); onUpdate(updated); toast('Mock controls saved in browser memory.') }
  return <section className="settings-page"><div className="section-head"><div><div className="eyebrow">SETTINGS</div><h1>Public demo controls.</h1><p className="lede">Provider secrets, OAuth, uploads, and external writes are disabled. This page demonstrates configuration states only.</p></div><span className="source-status">Mock only</span></div>
    <div className="provider-grid">{['anthropic', 'openai'].map((provider) => <article className="provider-card" key={provider}><div className="card-top"><span className="state-pill">{provider}</span><span className="not-configured">Disabled in demo</span></div><h2>{provider === 'anthropic' ? 'Anthropic' : 'OpenAI'}</h2><p>No key entry is available in the public build.</p><input disabled value="" placeholder="Secrets disabled" /></article>)}</div>
    <form className="controls" onSubmit={save}><div className="eyebrow">MOCK AGENT CONTROLS</div><label>Roles per search batch<input name="batch_size" type="number" min="1" max="100" defaultValue={settings.batch_size} /></label><label>Retries per failed operation<input name="max_retries" type="number" min="0" max="5" defaultValue={settings.max_retries} /></label><button className="button primary">Save controls</button></form>
  </section>
}

export function Activity({ runs }) {
  return <section className="activity-page"><div className="section-head"><div><div className="eyebrow">ACTIVITY</div><h1>What the agent actually did.</h1><p className="lede">Synthetic runs, counts, and blockers stay visible. There is no hidden network activity.</p></div><span className="state-pill">{runs.length} mock runs</span></div><div className="activity-table">{runs.map((run) => <article className="activity-row" key={run.id}><div><b>{run.kind}</b><span>{run.created_at}</span></div><strong className="configured">{run.state}</strong><p>{summaryText(run.summary)}</p></article>)}</div></section>
}
