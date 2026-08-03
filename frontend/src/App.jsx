import { useState, useEffect, useCallback } from 'react'
import { api } from './api.js'
import { Icon } from './icons.jsx'
import Dashboard from './components/Dashboard.jsx'
import Jobs from './components/Jobs.jsx'
import Applications from './components/Applications.jsx'
import Inbox from './components/Inbox.jsx'
import Settings from './components/Settings.jsx'

const TABS = [
  ['dashboard', 'Dashboard'],
  ['jobs', 'Jobs'],
  ['applications', 'Applications'],
  ['inbox', 'Inbox'],
  ['settings', 'Settings'],
]
const MTAB = { dashboard: 'Home', jobs: 'Jobs', applications: 'Apps', inbox: 'Inbox', settings: 'Settings' }

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [health, setHealth] = useState(null)
  const [running, setRunning] = useState(false)
  const [toasts, setToasts] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  const refreshHealth = useCallback(() => {
    api.health().then(setHealth).catch(() => setHealth(null))
  }, [])
  useEffect(() => { refreshHealth() }, [refreshHealth])

  const bump = () => setRefreshKey(k => k + 1)

  function go(t) { setTab(t); window.scrollTo(0, 0) }

  async function findJobs() {
    setRunning(true)
    try { const r = await api.findJobs(); toast(r.summary); bump() }
    catch (e) { toast(e.message, 'error') } finally { setRunning(false) }
  }

  const gmailOk = health?.gmail === 'connected'
  const ctx = { toast, go, bump, refreshKey, health, findJobs, running, refreshHealth }

  return (
    <div className="app">
      <aside className="side">
        <div className="brand"><span className="mark"><span /></span><h1>Job<b>Agent</b></h1></div>
        <nav className="nav">
          {TABS.map(([id, label]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => go(id)}>
              <Icon name={id} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="status">
            <span className="ring" style={{ background: health?.anthropic ? 'var(--good)' : 'var(--faint)' }} />
            {health?.anthropic ? 'Job search connected' : 'Job search not connected'}
          </div>
          <div className="status">
            <span className="ring" style={{ background: gmailOk ? 'var(--good)' : 'var(--faint)' }} />
            {gmailOk ? 'Gmail connected' : 'Gmail not connected'}
          </div>
          <button className="sync" onClick={findJobs} disabled={running}>
            {running ? 'Searching…' : 'Find jobs'}
          </button>
        </div>
      </aside>

      <main className="main">
        {tab !== 'inbox' && <Topbar onGo={go} />}
        {tab === 'dashboard' && <Dashboard ctx={ctx} />}
        {tab === 'jobs' && <Jobs ctx={ctx} />}
        {tab === 'applications' && <Applications ctx={ctx} />}
        {tab === 'inbox' && <Inbox ctx={ctx} />}
        {tab === 'settings' && <Settings ctx={ctx} />}
      </main>

      <nav className="mobile-nav">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => go(id)}>
            <Icon name={id} /><span>{MTAB[id] || label}</span>
          </button>
        ))}
      </nav>

      <div className="toasts">
        {toasts.map(t => <div key={t.id} className={`toast${t.type === 'error' ? ' toast-error' : ''}`}>{t.msg}</div>)}
      </div>
    </div>
  )
}

function Topbar({ onGo }) {
  return (
    <div className="topbar">
      <span className="demo-pill" style={{ color: 'var(--good)', background: '#eafaf2' }}>REAL DATA ONLY</span>
      This dashboard tracks verified roles and applications. No sample records are shown.
      <span className="more" style={{ color: 'var(--pop)', cursor: 'pointer', fontWeight: 600 }} onClick={() => onGo('settings')}>&nbsp;Settings →</span>
    </div>
  )
}
