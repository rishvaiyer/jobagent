import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api.js'
import Jobs from './components/Jobs.jsx'
import Inbox from './components/Inbox.jsx'
import Models from './components/Models.jsx'
import {
  Activity,
  DemoSettings,
  NeedsReview,
  ResumeLibrary,
  SkillsLibrary,
  SubmissionQueue,
  WorkflowApplications,
  WorkflowDashboard,
  reviewGroupCount,
  workflowCounts,
} from './components/WorkflowViews.jsx'

const NAV = [
  ['dashboard', 'Dashboard'],
  ['jobs', 'Jobs'],
  ['applications', 'Applications'],
  ['submission_queue', 'Submission queue'],
  ['needs_user_review', 'Needs your review'],
  ['resumes', 'Resumes'],
  ['skills', 'Skills'],
  ['inbox', 'Inbox'],
  ['models', 'Models'],
  ['settings', 'Settings'],
  ['activity', 'Activity'],
]

const allowedTabs = new Set(NAV.map(([id]) => id))

export default function App() {
  const [tab, setTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('tab')
    return allowedTabs.has(requested) ? requested : 'dashboard'
  })
  const [applications, setApplications] = useState([])
  const [settings, setSettings] = useState(null)
  const [runs, setRuns] = useState([])
  const [health, setHealth] = useState(null)
  const [resumes, setResumes] = useState([])
  const [skills, setSkills] = useState(null)
  const [error, setError] = useState('')
  const [toasts, setToasts] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const counts = useMemo(() => workflowCounts(applications), [applications])
  const navBadges = { applications: applications.length, submission_queue: counts.approved_queued || 0, needs_user_review: reviewGroupCount(applications) }

  const refresh = useCallback(async () => {
    try {
      const [nextApplications, nextSettings, nextRuns, nextHealth, nextResumes, nextSkills] = await Promise.all([
        api.applications(), api.settings(), api.runs(), api.health(), api.resumes(), api.skills(),
      ])
      setApplications(nextApplications)
      setSettings(nextSettings)
      setRuns(nextRuns)
      setHealth(nextHealth)
      setResumes(nextResumes)
      setSkills(nextSkills)
      setError('')
      setRefreshKey((value) => value + 1)
    } catch (nextError) { setError(nextError.message) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  function go(nextTab) {
    setTab(nextTab)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', nextTab)
    window.history.replaceState({}, '', url)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function toast(message, type = 'success') {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, message, type }])
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 3600)
  }

  const legacyContext = { toast, go, bump: () => setRefreshKey((value) => value + 1), refreshKey, health, demo: true }

  return <div className="app-shell">
    <header className="app-header">
      <div className="brand-lockup"><div className="brand-mark" aria-hidden="true">JA</div><div><div className="brand">Job<span>Agent</span> <small>PUBLIC DEMO</small></div><p>Privacy-safe application control center</p></div></div>
      <div className="header-controls"><span className="privacy-state">Mock data · browser memory only</span><div className={`system-state ${health?.ready ? 'good' : ''}`} role="status"><i />{health?.ready ? 'Demo ready' : 'Loading demo'}</div><button className="refresh-action" onClick={() => window.location.reload()}>↻ Reset demo</button></div>
    </header>
    <nav className="primary-nav" aria-label="Primary navigation">{NAV.map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => go(id)}>{label}{navBadges[id] !== undefined ? <b>{navBadges[id]}</b> : null}</button>)}</nav>
    {error && <div className="toast error" role="alert">{error}<button onClick={refresh}>Retry</button></div>}
    <main className="page-stage">
      {tab === 'dashboard' && <WorkflowDashboard applications={applications} counts={counts} runs={runs} onGo={go} />}
      {tab === 'jobs' && <Jobs ctx={legacyContext} />}
      {tab === 'applications' && <WorkflowApplications applications={applications} counts={counts} onUpdate={setApplications} toast={toast} />}
      {tab === 'submission_queue' && <SubmissionQueue applications={applications} onGo={go} />}
      {tab === 'needs_user_review' && <NeedsReview applications={applications} onUpdate={setApplications} toast={toast} />}
      {tab === 'resumes' && <ResumeLibrary resumes={resumes} onUpdate={setResumes} toast={toast} />}
      {tab === 'skills' && <SkillsLibrary skills={skills} onUpdate={setSkills} toast={toast} />}
      {tab === 'inbox' && <Inbox ctx={legacyContext} />}
      {tab === 'models' && <Models />}
      {tab === 'settings' && <DemoSettings settings={settings} onUpdate={setSettings} toast={toast} />}
      {tab === 'activity' && <Activity runs={runs} />}
    </main>
    <div className="toasts">{toasts.map((item) => <div key={item.id} className={`toast ${item.type === 'error' ? 'error' : 'success'}`}>{item.message}</div>)}</div>
  </div>
}
