import assert from 'node:assert/strict'
import test from 'node:test'

import {
  answerReviewItem,
  queueApplication,
  recordApplicationReceipt,
} from './applicationState.js'

const NOW = '2026-08-19T12:00:00.000Z'

function blockedApplication() {
  return {
    id: 'app-test',
    workflow_state: 'ready_for_review',
    review_items: [
      { item_key: 'location', answer: '' },
      { item_key: 'travel', answer: '' },
    ],
    evidence_events: [],
  }
}

test('unresolved answers block the submission queue', () => {
  const queued = queueApplication(blockedApplication(), NOW)
  assert.equal(queued.workflow_state, 'needs_user_review')
  assert.equal(queued.evidence_events.at(-1).type, 'queue_blocked')
})

test('answering one of several questions does not silently queue', () => {
  const updated = answerReviewItem(blockedApplication(), 'location', 'Remote', NOW)
  assert.equal(updated.workflow_state, 'needs_user_review')
  assert.equal(updated.review_items.filter((item) => !item.answer).length, 1)
})

test('answering the final question queues but does not mark Applied', () => {
  const first = answerReviewItem(blockedApplication(), 'location', 'Remote', NOW)
  const updated = answerReviewItem(first, 'travel', 'No', NOW)
  assert.equal(updated.workflow_state, 'approved_queued')
  assert.equal(updated.submission_confirmation, undefined)
})

test('Applied requires confirmation text, source, and timestamp', () => {
  const queued = { ...blockedApplication(), workflow_state: 'approved_queued', review_items: [] }
  assert.throws(() => recordApplicationReceipt(queued, {}), /Confirmation text/)
  assert.throws(
    () => recordApplicationReceipt(queued, { confirmation_text: 'Accepted', source_url: 'not-a-url', observed_at: NOW }),
    /HTTP\(S\)/,
  )
  assert.throws(
    () => recordApplicationReceipt(queued, { confirmation_text: 'Accepted', source_url: 'https://example.com/receipt', observed_at: 'later' }),
    /timestamp/,
  )
})

test('a valid receipt transitions to Applied and duplicate receipts are idempotent', () => {
  const queued = { ...blockedApplication(), workflow_state: 'approved_queued', review_items: [] }
  const receipt = {
    confirmation_text: 'Mock ATS confirmation DEMO-2042',
    source_url: 'https://example.com/receipts/demo-2042',
    observed_at: NOW,
  }
  const applied = recordApplicationReceipt(queued, receipt)
  const repeated = recordApplicationReceipt(applied, receipt)
  assert.equal(applied.workflow_state, 'applied')
  assert.equal(applied.evidence_events.length, 1)
  assert.strictEqual(repeated, applied)
})

test('a receipt cannot skip approval', () => {
  assert.throws(
    () => recordApplicationReceipt(blockedApplication(), {
      confirmation_text: 'Mock ATS confirmation',
      source_url: 'https://example.com/receipts/demo',
      observed_at: NOW,
    }),
    /Approve and queue first/,
  )
})
