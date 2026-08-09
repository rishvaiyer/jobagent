import { useId, useState } from 'react'
import { summarizeDescription } from './jobDescription.js'

export default function JobDescription({ description }) {
  const [expanded, setExpanded] = useState(false)
  const fullDescriptionId = useId()
  const summary = summarizeDescription(description)

  if (typeof description !== 'string' || !description.trim()) return null

  return (
    <section className="job-description" aria-label="Job description">
      <div className="job-description-head">
        <span className="job-description-label">Quick summary</span>
        <button
          type="button"
          className="job-description-toggle"
          aria-controls={fullDescriptionId}
          aria-expanded={expanded}
          onClick={() => setExpanded(value => !value)}
        >
          <span className={`job-description-caret${expanded ? ' is-open' : ''}`} aria-hidden="true">⌄</span>
          {expanded ? 'Hide full description' : 'Show full description'}
        </button>
      </div>
      {summary.length > 0 && (
        <ul className="job-description-summary">
          {summary.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
        </ul>
      )}
      <div id={fullDescriptionId} className="job-description-full" hidden={!expanded}>
        {description}
      </div>
    </section>
  )
}
