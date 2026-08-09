# Collapsed Job Description Summaries

## Goal

Make every job card easy to scan by defaulting to a concise four-bullet summary while keeping the authoritative full description available behind a caret toggle.

## Design

- Add one shared `JobDescription` component for all job cards.
- Normalize description text, remove obvious boilerplate, and derive up to four readable summary bullets from existing lines/sentences. No external summarization service or data mutation is introduced.
- Render the summary open by default; render the original full description closed by default inside an accessible disclosure control with `aria-expanded` and a visible caret.
- Preserve the exact full description text and current card actions. Empty descriptions render nothing.
- Keep the behavior responsive and keyboard accessible at the existing desktop and mobile breakpoints.

## Verification

- Unit-test summary extraction for multiline descriptions, sentence-based descriptions, long text, and empty input.
- Build the frontend and inspect the Jobs view at desktop and mobile widths, including opening and closing the full description.
