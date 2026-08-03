import { useState, useEffect } from 'react'
import { api } from '../api.js'

export default function Settings({ ctx }) {
  const [settings, setSettings] = useState(null)
  const [profile, setProfile] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [usage, setUsage] = useState(null)

  useEffect(() => {
    api.getSettings().then(setSettings).catch(e => ctx.toast(e.message, 'error'))
    api.getProfile().then(setProfile).catch(e => ctx.toast(e.message, 'error'))
    api.tokenUsage().then(setUsage).catch(() => {})
  }, [])

  if (!settings || !profile) return <div className="wrap"><div className="loading">Loading…</div></div>

  const setS = (k, v) => setSettings({ ...settings, [k]: v })
  const setP = (k, v) => setProfile({ ...profile, [k]: v })
  const join = arr => (Array.isArray(arr) ? arr.join(', ') : (arr || ''))
  const split = s => s.split(',').map(x => x.trim()).filter(Boolean)
  const sf = settings.search_filters || {}
  const ds = settings.draft_style || {}
  const setSF = (k, v) => setSettings({ ...settings, search_filters: { ...sf, [k]: v } })
  const setDS = (k, v) => setSettings({ ...settings, draft_style: { ...ds, [k]: v } })

  async function saveSettings() {
    const payload = { ...settings }
    delete payload.llm_api_key_set
    if (apiKey) payload.llm_api_key = apiKey
    try { const r = await api.updateSettings(payload); setSettings(r); setApiKey(''); ctx.toast('Settings saved'); ctx.refreshHealth() }
    catch (e) { ctx.toast(e.message, 'error') }
  }
  async function saveProfile() {
    try { const r = await api.updateProfile(profile); setProfile(r); ctx.toast('Profile saved') }
    catch (e) { ctx.toast(e.message, 'error') }
  }

  return (
    <div className="wrap">
      <div className="head">
        <div className="eyebrow">Settings</div>
        <h2>Configuration</h2>
        <p>Your profile drives matching and drafting. Keys are stored locally and never committed.</p>
      </div>

      <div className="ssection">
        <div className="sec-title">Your profile</div>
        <div className="panel">
          <Field label="Name"><input className="sinput" value={profile.name || ''} onChange={e => setP('name', e.target.value)} /></Field>
          <Field label="Headline"><input className="sinput" value={profile.headline || ''} onChange={e => setP('headline', e.target.value)} /></Field>
          <Field label="Target roles" desc="comma-separated"><input className="sinput" value={join(profile.target_roles)} onChange={e => setP('target_roles', split(e.target.value))} /></Field>
          <Field label="Target locations" desc="comma-separated"><input className="sinput" value={join(profile.target_locations)} onChange={e => setP('target_locations', split(e.target.value))} /></Field>
          <Field label="Skills" desc="comma-separated"><input className="sinput" value={join(profile.skills)} onChange={e => setP('skills', split(e.target.value))} /></Field>
          <Field label="Minimum salary"><input className="sinput" value={profile.min_salary || ''} onChange={e => setP('min_salary', e.target.value)} /></Field>
          <Field label="Preferences" desc="what you want and what to avoid"><input className="sinput" value={profile.preferences || ''} onChange={e => setP('preferences', e.target.value)} /></Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="sec-title" style={{ display: 'block', marginBottom: 8 }}>Résumé text</label>
          <textarea className="sinput" style={{ width: '100%', minHeight: 120 }} value={profile.resume_text || ''} onChange={e => setP('resume_text', e.target.value)} />
        </div>
        <div className="actions" style={{ marginTop: 14 }}><button className="btn solid" onClick={saveProfile}>Save profile</button></div>
      </div>

      <div className="ssection">
        <div className="sec-title">Claude · LLM mode</div>
        <div className="panel">
          <Field label="Anthropic API key" desc="Add to search real jobs and draft with Claude. Leave blank to stay in mock mode.">
            <input className="sinput" type="password" placeholder={settings.llm_api_key_set ? '•••• (set — blank keeps it)' : 'sk-ant-…'} value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </Field>
          <Field label="Model" desc="default claude-opus-4-8">
            <select className="sinput" value={settings.model || 'claude-opus-4-8'} onChange={e => setS('model', e.target.value)}>
              <option value="claude-opus-4-8">claude-opus-4-8</option>
              <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
              <option value="claude-haiku-4-5">claude-haiku-4-5</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="ssection">
        <div className="sec-title">Gmail · live mode</div>
        <div className="panel">
          <Field label="OAuth client-secret path" desc="See the README for the one-time Google setup. Blank = mock inbox.">
            <input className="sinput" value={settings.gmail_client_secret_path || ''} onChange={e => setS('gmail_client_secret_path', e.target.value)} placeholder="~/.config/jobagent/client_secret.json" />
          </Field>
          <Field label="Token path"><input className="sinput" value={settings.gmail_token_path || ''} onChange={e => setS('gmail_token_path', e.target.value)} placeholder="backend/data/gmail_token.json" /></Field>
          <Field label="Inbox lookback (days)"><input className="sinput" type="number" value={settings.inbox_lookback_days || 14} onChange={e => setS('inbox_lookback_days', Number(e.target.value))} /></Field>
        </div>
        <div className="actions" style={{ marginTop: 14 }}><button className="btn solid" onClick={saveSettings}>Save settings</button></div>
      </div>

      <div className="ssection">
        <div className="sec-title">Job-search filters</div>
        <div className="panel">
          <Field label="Remote only" desc="Only surface remote roles">
            <Toggle on={!!sf.remote_only} onClick={() => setSF('remote_only', !sf.remote_only)} />
          </Field>
          <Field label="Employment type">
            <select className="sinput" value={sf.employment_type || 'any'} onChange={e => setSF('employment_type', e.target.value)}>
              <option value="any">any</option>
              <option value="full-time">full-time</option>
              <option value="contract">contract</option>
              <option value="part-time">part-time</option>
            </select>
          </Field>
          <Field label="Must-have keywords" desc="comma-separated; a role must mention all of these">
            <input className="sinput" value={join(sf.include_keywords)} onChange={e => setSF('include_keywords', split(e.target.value))} />
          </Field>
          <Field label="Exclude keywords" desc="comma-separated; drop roles mentioning any of these">
            <input className="sinput" value={join(sf.exclude_keywords)} onChange={e => setSF('exclude_keywords', split(e.target.value))} />
          </Field>
          <Field label="Avoid companies" desc="comma-separated company names to skip">
            <input className="sinput" value={join(sf.avoid_companies)} onChange={e => setSF('avoid_companies', split(e.target.value))} />
          </Field>
          <Field label="Enforce minimum salary" desc="skip roles clearly below your profile's minimum">
            <Toggle on={!!sf.enforce_min_salary} onClick={() => setSF('enforce_min_salary', !sf.enforce_min_salary)} />
          </Field>
        </div>
        <div className="actions" style={{ marginTop: 14 }}><button className="btn solid" onClick={saveSettings}>Save filters</button></div>
      </div>

      <div className="ssection">
        <div className="sec-title">Draft style</div>
        <div className="panel">
          <Field label="Tone">
            <select className="sinput" value={ds.tone || 'warm'} onChange={e => setDS('tone', e.target.value)}>
              <option value="warm">warm</option>
              <option value="formal">formal</option>
              <option value="concise">concise</option>
            </select>
          </Field>
          <Field label="Reply length">
            <select className="sinput" value={ds.length || 'medium'} onChange={e => setDS('length', e.target.value)}>
              <option value="short">short</option>
              <option value="medium">medium</option>
              <option value="long">long</option>
            </select>
          </Field>
          <Field label="Auto-draft replies" desc="draft replies automatically right after Scan inbox">
            <Toggle on={!!ds.auto_draft_replies} onClick={() => setDS('auto_draft_replies', !ds.auto_draft_replies)} />
          </Field>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="sec-title" style={{ display: 'block', marginBottom: 8 }}>Email signature</label>
          <textarea className="sinput" style={{ width: '100%', minHeight: 70 }} placeholder={'Best,\nYour Name'} value={ds.signature || ''} onChange={e => setDS('signature', e.target.value)} />
        </div>
        <div className="actions" style={{ marginTop: 14 }}><button className="btn solid" onClick={saveSettings}>Save draft style</button></div>
      </div>

      <div className="ssection">
        <div className="sec-title">Estimated token usage</div>
        {usage?.by_operation?.length ? (
          <div className="panel">
            {usage.by_operation.map((u, i) => (
              <div className="srow" key={i}>
                <div><div className="s-label">{u.operation}</div><div className="s-desc">{u.count} call(s) · ~{u.total_input_tokens} in / {u.total_output_tokens} out (estimated)</div></div>
                <div className="score">${u.estimated_cost_usd}</div>
              </div>
            ))}
          </div>
        ) : <div className="empty">No LLM usage yet — mock mode is free.</div>}
      </div>
    </div>
  )
}

function Field({ label, desc, children }) {
  return (
    <div className="srow">
      <div><div className="s-label">{label}</div>{desc && <div className="s-desc">{desc}</div>}</div>
      {children}
    </div>
  )
}

function Toggle({ on, onClick }) {
  return <div className={`tog${on ? ' on' : ''}`} role="switch" aria-checked={on} onClick={onClick} />
}
