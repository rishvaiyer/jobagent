const clone = (value) => JSON.parse(JSON.stringify(value))
const pause = (value) => new Promise((resolve) => window.setTimeout(() => resolve(clone(value)), 90))

const resumes = [
  { id: 'resume-1', title: 'Software Engineer', original_filename: 'demo-software-engineer.pdf', is_main: true, is_archived: false, is_ready: true, quality_label: 'Mock · one page' },
  { id: 'resume-2', title: 'Product Engineer', original_filename: 'demo-product-engineer.pdf', is_main: false, is_archived: false, is_ready: true, quality_label: 'Mock · one page' },
  { id: 'resume-3', title: 'Data Platform', original_filename: 'demo-data-platform.pdf', is_main: false, is_archived: true, is_ready: true, quality_label: 'Mock · archived' },
]

let applications = [
  {
    id: 'app-1', workflow_state: 'ready_for_review', match_score: 94,
    job: { title: 'Senior Backend Engineer', company: 'Northstar Labs', location: 'Remote', url: 'https://example.com/jobs/backend', posting_status: 'verified', posting_label: 'Demo posting', cover_letter_required: false, description: 'Build reliable services and developer tooling for a fictional workflow platform.', requirements: ['Production API design', 'Python or TypeScript', 'Cloud observability', 'Cross-functional delivery'] },
    selected_resume: resumes[0], review_items: [],
  },
  {
    id: 'app-2', workflow_state: 'ready_for_review', match_score: 89,
    job: { title: 'Product Engineer', company: 'Harbor Analytics', location: 'New York, NY', url: 'https://example.com/jobs/product', posting_status: 'verified', posting_label: 'Demo posting', cover_letter_required: true, description: 'Ship customer-facing workflow features with a small fictional product team.', requirements: ['React interfaces', 'API integration', 'Product judgment', 'Clear written communication'] },
    selected_resume: resumes[1], cover_letter: 'Synthetic cover letter for the public demo. No candidate history or personal information is included.', review_items: [],
  },
  {
    id: 'app-3', workflow_state: 'needs_user_review', match_score: 86,
    job: { title: 'Platform Engineer', company: 'Cedar Cloud', location: 'Hybrid', url: 'https://example.com/jobs/platform', posting_status: 'verified', posting_label: 'Demo posting', cover_letter_required: false, description: 'Improve deployment reliability for a fictional cloud platform.', requirements: ['CI/CD systems', 'Infrastructure as code', 'Incident response', 'Developer experience'] },
    selected_resume: resumes[0], review_items: [{ item_key: 'work_preference', question: 'Is this work arrangement acceptable?', reason: 'The demo never invents a candidate preference.', answer: '' }],
  },
  {
    id: 'app-4', workflow_state: 'approved_queued', match_score: 91,
    job: { title: 'Full Stack Engineer', company: 'Signal Grove', location: 'Remote', url: 'https://example.com/jobs/full-stack', posting_status: 'verified', posting_label: 'Demo posting', cover_letter_required: false, description: 'Build a fictional operations console from API to interface.', requirements: ['React', 'Backend services', 'SQL', 'Testing'] },
    selected_resume: resumes[0], review_items: [],
  },
  {
    id: 'app-5', workflow_state: 'applied', match_score: 84,
    job: { title: 'Software Engineer', company: 'Lantern Systems', location: 'Boston, MA', url: 'https://example.com/jobs/software', posting_status: 'verified', posting_label: 'Demo posting', cover_letter_required: false, description: 'Synthetic applied-history record.', requirements: ['JavaScript', 'APIs', 'Databases', 'Testing'] },
    selected_resume: resumes[0], review_items: [], submission_confirmation: 'Mock ATS receipt · DEMO-1042',
  },
  {
    id: 'app-6', workflow_state: 'archived', match_score: 72,
    job: { title: 'Data Engineer', company: 'Willow Works', location: 'Remote', url: 'https://example.com/jobs/data', posting_status: 'verified', posting_label: 'Demo posting', cover_letter_required: false, description: 'Synthetic archived record.', requirements: ['Python', 'SQL', 'Data pipelines', 'Monitoring'] },
    selected_resume: resumes[2], review_items: [],
  },
]

let jobs = applications.slice(0, 4).map((application, index) => ({
  id: `job-${index + 1}`, ...application.job, match_score: application.match_score,
  match_reason: 'Synthetic fit summary based on the mock profile.', status: index === 3 ? 'saved' : 'new', source: 'demo', apply_method: 'web', salary: index % 2 ? '$140k–$165k' : '$150k–$180k',
}))

let inbox = [
  { id: 'mail-1', sender: 'Recruiting Team <recruiting@example.com>', subject: 'Mock interview scheduling request', body: 'This is a synthetic recruiter message used only to demonstrate inbox triage.', category: 'interview', needs_response: true, draft: { id: 'draft-1', status: 'draft', confidence: 'high', draft_text: 'Thanks for reaching out. The example times work for this public demo.', reason: 'Synthetic draft. No message will be sent.' } },
  { id: 'mail-2', sender: 'Hiring Updates <updates@example.com>', subject: 'Mock application update', body: 'Your fictional application has moved to the next review stage.', category: 'application_update', needs_response: false },
  { id: 'mail-3', sender: 'Talent Partner <talent@example.com>', subject: 'Mock role introduction', body: 'A synthetic note about a fictional engineering role.', category: 'recruiter', needs_response: true },
]

let settings = {
  public_deployment: true, batch_size: 8, max_retries: 2,
  providers: { anthropic: { configured: false, source: 'demo' }, openai: { configured: false, source: 'demo' } },
}

let skills = {
  skills_inventory: {
    technical: [{ name: 'API design', evidence: 'Mock evidence: tested service contract', readiness: 'baseline' }, { name: 'React', evidence: 'Mock evidence: responsive interface', readiness: 'baseline' }],
    applied_ai: [{ name: 'Structured outputs', evidence: 'Mock evidence: schema-validated fixture', readiness: 'role_specific' }],
    business_delivery: [{ name: 'Requirements mapping', evidence: 'Mock evidence: feature acceptance matrix', readiness: 'baseline' }],
    role_specific: [{ name: 'Infrastructure as code', evidence: 'Mock evidence: sample deployment plan', readiness: 'role_specific' }],
  },
  skills_guardrails: ['Use only evidence attached to the mock profile.', 'Never invent employment history, eligibility, or outcomes.'],
}

let runs = [
  { id: 'run-3', kind: 'Mock application sync', state: 'completed', created_at: 'Today · 9:42 AM', summary: { scanned: 6, receipts_found: 1, duplicates_blocked: 1 } },
  { id: 'run-2', kind: 'Mock role search', state: 'completed', created_at: 'Yesterday · 4:10 PM', summary: 'Four synthetic roles ranked against the demo profile.' },
  { id: 'run-1', kind: 'Mock inbox scan', state: 'completed', created_at: 'Yesterday · 3:55 PM', summary: 'Three synthetic messages classified. No mailbox connection used.' },
]

function updateApplication(id, transform) {
  let updated
  applications = applications.map((application) => {
    if (application.id !== id) return application
    updated = transform(application)
    return updated
  })
  return pause(updated)
}

export const api = {
  health: () => pause({ status: 'ok', ready: true, mode: 'mock', anthropic: false, gmail: 'mock' }),
  applications: () => pause(applications),
  settings: () => pause(settings),
  runs: () => pause(runs),
  resumes: () => pause(resumes),
  skills: () => pause(skills),
  approveApplication: (id) => updateApplication(id, (application) => ({ ...application, workflow_state: (application.review_items || []).some((item) => !item.answer) ? 'needs_user_review' : 'approved_queued' })),
  denyApplication: (id) => updateApplication(id, (application) => ({ ...application, workflow_state: 'archived' })),
  answerReviewGlobal: async (itemKey, answer) => {
    const updated = []
    applications = applications.map((application) => {
      const hasItem = (application.review_items || []).some((item) => item.item_key === itemKey && !item.answer)
      if (!hasItem) return application
      const next = { ...application, workflow_state: 'approved_queued', review_items: application.review_items.map((item) => item.item_key === itemKey ? { ...item, answer } : item) }
      updated.push(next)
      return next
    })
    return pause({ applications: updated, updated_count: updated.length })
  },
  setMainResume: (id) => { resumes.forEach((resume) => { resume.is_main = resume.id === id }); return pause({ ok: true }) },
  setResumeArchived: (id, archived) => { const resume = resumes.find((item) => item.id === id); resume.is_archived = archived; return pause(resume) },
  addMockResume: (title) => { const resume = { id: `resume-${Date.now()}`, title: title || 'Demo Resume', original_filename: 'demo-resume.pdf', is_main: false, is_archived: false, is_ready: true, quality_label: 'Mock · one page' }; resumes.unshift(resume); return pause(resume) },
  updateSkills: (data) => { skills = clone(data); return pause(skills) },
  updateSettings: (data) => { settings = { ...settings, ...data }; return pause(settings) },
  updateProvider: () => Promise.reject(new Error('Provider keys are disabled in the public demo.')),
  testProvider: () => pause({ reachable: false, error_category: 'demo_mode' }),
  removeProvider: () => pause({ configured: false, source: 'demo' }),

  getJobs: () => pause(jobs),
  findJobs: () => pause({ summary: 'Mock search complete. Four synthetic roles are ready.' }),
  saveJob: (id) => { jobs = jobs.map((job) => job.id === id ? { ...job, status: 'saved' } : job); return pause({ ok: true }) },
  dismissJob: (id) => { jobs = jobs.map((job) => job.id === id ? { ...job, status: 'dismissed' } : job); return pause({ ok: true }) },
  draftApplication: () => pause({ ok: true }),
  getInbox: () => pause(inbox),
  scanInbox: () => pause({ summary: 'Mock inbox refreshed. No mailbox was accessed.' }),
  draftReply: (id) => { inbox = inbox.map((thread) => thread.id === id ? { ...thread, draft: { id: `draft-${id}`, status: 'draft', confidence: 'demo', draft_text: 'Synthetic reply draft for the public demo.', reason: 'No message will be sent.' } } : thread); return pause({ note: 'Mock reply created locally.' }) },
  updateReplyDraft: (id, draftText) => { inbox = inbox.map((thread) => thread.id === id ? { ...thread, draft: { ...(thread.draft || {}), id: thread.draft?.id || `draft-${id}`, status: 'draft', draft_text: draftText } } : thread); return pause({ note: 'Mock draft saved in memory.' }) },
  sendReply: (id) => { inbox = inbox.map((thread) => thread.id === id ? { ...thread, needs_response: false, draft: { ...thread.draft, status: 'sent' } } : thread); return pause({ note: 'Marked reviewed in the demo. Nothing was sent.', sent: false }) },
}
