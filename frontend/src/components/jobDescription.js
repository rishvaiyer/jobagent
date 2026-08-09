const BOILERPLATE = new Set([
  'apply now',
  'career resources',
  'companies',
  'dice job match score™',
  'fitment',
  'job details',
  'job search',
  'login',
  'request a demo',
  'skills',
  "i'm an employer",
  'why dice',
])

function cleanLine(value) {
  return value
    .replace(/^[-•·▪]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitSentences(value) {
  const pieces = value.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []
  return pieces.map(cleanLine).filter(Boolean)
}

function isUseful(value) {
  const normalized = value.toLowerCase()
  const scrapedChrome = /^(job search|companies|career resources|why dice|apply now|login|request a demo|fitment|skills|job details)/i
  return value.length > 2 && !BOILERPLATE.has(normalized) && !scrapedChrome.test(normalized)
}

export function summarizeDescription(description, limit = 4) {
  if (typeof description !== 'string' || !description.trim() || limit < 1) return []

  const pieces = description
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .flatMap(line => splitSentences(cleanLine(line)))
    .filter(isUseful)

  return [...new Set(pieces)].slice(0, limit)
}
