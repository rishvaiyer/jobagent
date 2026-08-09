# Collapsed Job Description Summaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show every job card as a four-bullet summary by default while preserving the full job description behind an accessible caret toggle.

**Architecture:** Extract a pure `summarizeDescription` helper into a small frontend module. Render it through a shared `JobDescription` React component, then replace the inline description in `Jobs.jsx`; the original description remains unchanged in the closed disclosure panel.

**Tech Stack:** React 18, Vite, plain CSS, Node's built-in test runner and assertions.

## Global Constraints

- No API, database, or stored job-description changes.
- Summary output is deterministic and limited to four bullets.
- Full description is collapsed initially and remains keyboard accessible.
- Existing job-card actions and responsive breakpoints remain unchanged.

---

### Task 1: Summary extraction contract

**Files:**
- Create: `frontend/src/components/jobDescription.js`
- Create: `frontend/scripts/test-job-description.mjs`
- Modify: `frontend/package.json`

**Interfaces:**
- Produces `summarizeDescription(description, limit = 4): string[]` for the React component.

- [ ] **Step 1: Write the failing test**

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test frontend/scripts/test-job-description.mjs`

Expected: FAIL because `frontend/src/components/jobDescription.js` does not exist.

- [ ] **Step 3: Implement the minimal helper**

Implement `summarizeDescription` by normalizing line endings, removing blank/boilerplate lines, splitting long single paragraphs at sentence boundaries, trimming whitespace, and returning the first four meaningful entries.

- [ ] **Step 4: Add the focused test script**

Add this script to `frontend/package.json`:

```json
"test:job-description": "node --test scripts/test-job-description.mjs"
```

- [ ] **Step 5: Run the focused test**

Run: `npm --prefix frontend run test:job-description`

Expected: PASS with three tests and zero failures.

### Task 2: Shared disclosure component

**Files:**
- Create: `frontend/src/components/JobDescription.jsx`
- Modify: `frontend/src/components/Jobs.jsx`
- Modify: `frontend/src/styles.css`

**Interfaces:**
- Consumes `description: string`.
- Renders `.job-description` with a visible `Quick summary` label, four-or-fewer `<li>` items, and a button with `aria-expanded` that toggles the original text.

- [ ] **Step 1: Write the failing component test or DOM contract**

Extend the Node test contract with the empty-input and four-item behavior; use the Vite build as the integration check for the JSX component because this repository has no React test runner.

- [ ] **Step 2: Implement the component**

Use `useState(false)` so the full text begins closed. Render no wrapper for empty descriptions. Use a button rather than a non-semantic click target, include `aria-controls`, and use a text caret that rotates when expanded.

- [ ] **Step 3: Replace the inline description**

Replace `{j.description && <div className="j-desc">{j.description}</div>}` in `Jobs.jsx` with `<JobDescription description={j.description} />`.

- [ ] **Step 4: Add responsive styles**

Add compact spacing, readable list markers, a focus-visible state, and a full-description panel that wraps long text on desktop and mobile.

- [ ] **Step 5: Run focused checks**

Run: `npm --prefix frontend run test:job-description && npm --prefix frontend run build`

Expected: all summary tests pass and Vite exits with code 0.

### Task 3: Visual verification

**Files:**
- No new source files.

- [ ] **Step 1: Start the frontend preview**

Run: `npm --prefix frontend run dev -- --host 127.0.0.1`

- [ ] **Step 2: Inspect desktop and mobile Jobs views**

Verify that every visible job card starts with the four-bullet summary, the full description is not visible initially, and the caret opens/closes it without changing action buttons. Check a desktop viewport and 390px mobile viewport.

- [ ] **Step 3: Run final verification**

Run: `npm --prefix frontend run test:job-description && npm --prefix frontend run build && git diff --check`

Expected: zero test failures, successful production build, and no whitespace errors.
