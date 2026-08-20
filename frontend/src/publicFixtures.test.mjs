import assert from 'node:assert/strict'
import test from 'node:test'

import { publicApplicationFixtures } from './api.js'

test('public application fixtures stay synthetic and use inert destinations', () => {
  assert.ok(publicApplicationFixtures.length > 0)
  for (const application of publicApplicationFixtures) {
    assert.match(application.id, /^app-/)
    assert.equal(new URL(application.job.url).hostname, 'example.com')
    assert.match(application.selected_resume.original_filename, /^demo-/)
    const serialized = JSON.stringify(application).toLowerCase()
    for (const forbidden of ['rishva', 'linkedin.com', 'gmail.com', 'greenhouse.io', 'lever.co']) {
      assert.equal(serialized.includes(forbidden), false, `fixture contained ${forbidden}`)
    }
    if (application.workflow_state === 'applied') {
      assert.ok(application.submission_confirmation?.confirmation_text)
      assert.equal(new URL(application.submission_confirmation.source_url).hostname, 'example.com')
      assert.ok(Date.parse(application.submission_confirmation.observed_at))
    }
  }
})
