# Guest and New User Tutorial Plan

## Goal

Help a guest or new user understand Pink Sundew in under one minute:

1. Pink Sundew is a shared board for human and agent work.
2. Agent sync keeps local coding tools and instruction targets current.
3. Agents can read task context and write progress back to the board.
4. Completion should land as a reviewable workflow signal, not vanish into chat.

## Audience

- Guest users entering the sandbox for the first time.
- Newly authenticated users opening their first project.
- Returning users who choose to replay the tour from a help/profile entry point.

## Trigger Rules

- Guests: show once after `/guest` creates or opens the temporary project.
- New authenticated users: show once after the first project dashboard loads.
- Store completion locally for guests and on the profile for authenticated users when that exists.
- Always include Skip and Replay later actions.
- Use the existing custom modal/overlay patterns. Do not use browser pop-ups.

## Tour Flow

### 1. Welcome to the shared board

Target: board columns and add-task action.

Message: "This is the shared workspace for you and your coding agent. Add tasks here, then let the agent read the same context."

Action: Start tour.

### 2. Show agent sync

Target: MCP Server and Agent Instructions dashboard cards.

Message: "Agent sync connects this project to your local coding tools and keeps instruction files aligned."

Action: Open setup or continue.

### 3. Open a task like the agent will

Target: task card or task detail modal.

Message: "Tasks carry the scope your agent reads: title, description, status, priority, tags, replies, and related context."

Action: Open a sample task.

### 4. Highlight progress messages

Target: task messages/replies area.

Message: "Agents can post notes as they work, ask for help, and keep you out of the dark."

Action: Continue.

### 5. Finish with completion and review

Target: workflow signal and review/status column.

Message: "When work is done, agents should mark it ready for review so you can inspect the result before completion."

Action: Finish tour.

## Suggested Implementation Shape

- Build a client component such as `OnboardingTour` mounted inside the dashboard layout or project page.
- Represent steps as typed data with `id`, `audience`, `target`, `title`, `body`, and `primaryAction`.
- Use element data attributes for anchors, for example `data-tour-target="agent-sync"`.
- If a target is missing on mobile or during loading, fall back to a centered modal step.
- Keep the overlay focus-trapped and keyboard accessible.
- Track events with PostHog when available:
  - `onboarding_tour_started`
  - `onboarding_tour_step_viewed`
  - `onboarding_tour_completed`
  - `onboarding_tour_skipped`

## Copy Tone

Keep the tutorial short and concrete. It should feel like a calm walkthrough of the board, not a product pitch. Prefer "your agent can read this" over abstract words like "visibility" or "alignment."
