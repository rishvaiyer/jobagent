const RECEIPT_STATES = new Set(['approved_queued', 'submitting', 'applied'])

export function unresolvedReviewItems(application) {
  return (application.review_items || []).filter((item) => !(item.answer || '').trim())
}

function eventAlreadyRecorded(events, eventId) {
  return events.some((event) => event.event_id === eventId)
}

export function appendEvidenceEvent(application, event) {
  const current = application.evidence_events || []
  if (eventAlreadyRecorded(current, event.event_id)) return application
  return { ...application, evidence_events: [...current, Object.freeze({ ...event })] }
}

export function queueApplication(application, observedAt = new Date().toISOString()) {
  const unresolved = unresolvedReviewItems(application)
  if (unresolved.length) {
    return appendEvidenceEvent(
      { ...application, workflow_state: 'needs_user_review' },
      {
        event_id: `queue-blocked:${application.id}:${unresolved.map((item) => item.item_key).sort().join(',')}`,
        type: 'queue_blocked',
        observed_at: observedAt,
        detail: `${unresolved.length} unresolved answer${unresolved.length === 1 ? '' : 's'}`,
      },
    )
  }
  return appendEvidenceEvent(
    { ...application, workflow_state: 'approved_queued' },
    {
      event_id: `queued:${application.id}`,
      type: 'approved_queued',
      observed_at: observedAt,
      detail: 'Approved for an attempt, not submitted',
    },
  )
}

export function answerReviewItem(application, itemKey, answer, observedAt = new Date().toISOString()) {
  const cleanAnswer = answer.trim()
  if (!cleanAnswer) throw new Error('A non-empty answer is required.')
  const hasOpenItem = (application.review_items || []).some(
    (item) => item.item_key === itemKey && !(item.answer || '').trim(),
  )
  if (!hasOpenItem) return application
  const answered = {
    ...application,
    review_items: application.review_items.map((item) => (
      item.item_key === itemKey ? { ...item, answer: cleanAnswer } : item
    )),
  }
  const withAnswerEvidence = appendEvidenceEvent(answered, {
    event_id: `answer:${application.id}:${itemKey}`,
    type: 'review_answered',
    observed_at: observedAt,
    detail: `Answered synthetic field ${itemKey}`,
  })
  return queueApplication(withAnswerEvidence, observedAt)
}

export function normalizeReceipt(receipt) {
  const confirmationText = (receipt?.confirmation_text || '').trim()
  const sourceUrl = (receipt?.source_url || '').trim()
  const observedAt = (receipt?.observed_at || '').trim()
  if (!confirmationText) throw new Error('Confirmation text is required before Applied.')
  if (!sourceUrl) throw new Error('A confirmation source is required before Applied.')
  let parsedSource
  try { parsedSource = new URL(sourceUrl) } catch { throw new Error('Confirmation source must be an HTTP(S) URL.') }
  if (!['http:', 'https:'].includes(parsedSource.protocol)) {
    throw new Error('Confirmation source must be an HTTP(S) URL.')
  }
  const timestamp = Date.parse(observedAt)
  if (!observedAt || Number.isNaN(timestamp)) {
    throw new Error('A valid confirmation timestamp is required before Applied.')
  }
  return {
    confirmation_text: confirmationText,
    source_url: parsedSource.toString(),
    observed_at: new Date(timestamp).toISOString(),
  }
}

export function receiptKey(receipt) {
  const normalized = normalizeReceipt(receipt)
  return `${normalized.source_url}|${normalized.confirmation_text}|${normalized.observed_at}`
}

export function recordApplicationReceipt(application, receipt) {
  if (!RECEIPT_STATES.has(application.workflow_state)) {
    throw new Error(`Cannot record a receipt from ${application.workflow_state}. Approve and queue first.`)
  }
  const normalized = normalizeReceipt(receipt)
  const key = receiptKey(normalized)
  const eventId = `receipt:${application.id}:${key}`
  if (eventAlreadyRecorded(application.evidence_events || [], eventId)) return application
  return appendEvidenceEvent(
    { ...application, workflow_state: 'applied', submission_confirmation: normalized },
    {
      event_id: eventId,
      type: 'receipt_observed',
      observed_at: normalized.observed_at,
      detail: normalized.confirmation_text,
      source_url: normalized.source_url,
    },
  )
}
