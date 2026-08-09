import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarizeDescription } from '../src/components/jobDescription.js'

test('returns up to four meaningful bullets from multiline descriptions', () => {
  assert.deepEqual(summarizeDescription('Build APIs\nOwn deployments\nPartner with QA\nUse C# and SQL\nExtra detail'), [
    'Build APIs', 'Own deployments', 'Partner with QA', 'Use C# and SQL',
  ])
})

test('splits a paragraph into readable sentence bullets', () => {
  assert.deepEqual(summarizeDescription('Build APIs. Own deployments. Partner with QA. Use C# and SQL.'), [
    'Build APIs.', 'Own deployments.', 'Partner with QA.', 'Use C# and SQL.',
  ])
})

test('returns an empty list for empty input', () => {
  assert.deepEqual(summarizeDescription(''), [])
})

test('skips scraped page chrome before the actual job content', () => {
  assert.deepEqual(summarizeDescription('Job Search Companies Career Resources Why Dice\nApply Now\nBuild APIs\nOwn deployments\nPartner with QA\nUse C# and SQL'), [
    'Build APIs', 'Own deployments', 'Partner with QA', 'Use C# and SQL',
  ])
})
