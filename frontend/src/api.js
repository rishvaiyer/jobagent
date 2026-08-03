const BASE = '/api'

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || res.statusText)
  }
  return res.json()
}

export const api = {
  health: () => req('GET', '/health'),
  dashboard: () => req('GET', '/dashboard'),

  findJobs: () => req('POST', '/agent/find-jobs'),
  scanInbox: () => req('POST', '/agent/scan-inbox'),
  draftReplies: () => req('POST', '/agent/draft-replies'),

  getJobs: () => req('GET', '/jobs'),
  saveJob: (id) => req('POST', `/jobs/${id}/save`),
  dismissJob: (id) => req('POST', `/jobs/${id}/dismiss`),
  draftApplication: (id) => req('POST', `/jobs/${id}/draft-application`),

  getApplications: () => req('GET', '/applications'),
  updateApplicationDraft: (id, data) => req('PUT', `/applications/${id}/draft`, data),
  updateApplicationStatus: (id, status) => req('PUT', `/applications/${id}/status`, { status }),
  approveApplication: (id) => req('POST', `/applications/${id}/approve`),

  getInbox: () => req('GET', '/inbox'),
  draftReply: (id) => req('POST', `/inbox/${id}/draft-reply`),
  updateReplyDraft: (id, draft_text) => req('PUT', `/inbox/${id}/draft`, { draft_text }),
  sendReply: (id) => req('POST', `/inbox/${id}/send`),

  getFollowups: () => req('GET', '/followups'),
  completeFollowup: (id) => req('POST', `/followups/${id}/complete`),

  getSettings: () => req('GET', '/settings'),
  updateSettings: (data) => req('POST', '/settings', { data }),
  getProfile: () => req('GET', '/profile'),
  updateProfile: (data) => req('POST', '/profile', { data }),
  tokenUsage: () => req('GET', '/token-usage'),
}
