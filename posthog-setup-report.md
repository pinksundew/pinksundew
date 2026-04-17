<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into AgentPlanner. Here's a summary of all changes made:

**New files created:**
- `instrumentation-client.ts` — Client-side PostHog initialization using the Next.js 15.3+ `instrumentation-client` pattern. Initializes with a reverse proxy (`/ingest`), error tracking (`capture_exceptions`), and debug mode in development.
- `src/lib/posthog-server.ts` — Server-side PostHog client factory using `posthog-node`. Returns a fresh `PostHog` instance with `flushAt: 1` and `flushInterval: 0` for reliable event delivery from short-lived serverless functions.
- `next.config.ts` — Updated to add PostHog reverse proxy rewrites (`/ingest/*` → `us.i.posthog.com`) to reduce ad-blocker interference.
- `.env.local` — `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` set.

**Modified files:**
- `src/app/(auth)/signup/page.tsx` — Identifies user and captures `user_signed_up` on successful email signup; captures `user_signed_up` with OAuth provider on OAuth flow start.
- `src/app/(auth)/login/page.tsx` — Identifies user and captures `user_logged_in` on successful email login; captures `user_logged_in` with OAuth provider on OAuth flow start.
- `src/app/(dashboard)/create-project/page.tsx` — Captures `project_created` on successful project creation.
- `src/components/modals/create-task-modal.tsx` — Captures `task_created` with status, priority, and feature flags (AI title, predecessor, due date).
- `src/app/api/keys/route.ts` — Server-side capture of `api_key_created` after API key creation.
- `src/app/api/keys/[keyId]/route.ts` — Server-side capture of `api_key_revoked` after key deletion.
- `src/app/api/guest/import/route.ts` — Server-side capture of `guest_board_imported` with task count and reuse status (key conversion event).
- `src/components/modals/export-modal.tsx` — Captures `export_prompt_copied` with format options and task count.
- `src/app/api/tasks/ai-title/route.ts` — Server-side capture of `ai_title_generated` with the Gemini model used.
- `src/app/api/bridge/tasks/route.ts` — Server-side capture of `agent_task_created` when an AI agent creates a task via the bridge API.

## Events

| Event | Description | File |
|-------|-------------|------|
| `user_signed_up` | User created an account via email/password or OAuth | `src/app/(auth)/signup/page.tsx` |
| `user_logged_in` | User signed in via email/password or OAuth | `src/app/(auth)/login/page.tsx` |
| `project_created` | User created a new project | `src/app/(dashboard)/create-project/page.tsx` |
| `task_created` | User created a task via the create task modal | `src/components/modals/create-task-modal.tsx` |
| `api_key_created` | User created an API key (server-side) | `src/app/api/keys/route.ts` |
| `api_key_revoked` | User deleted an API key (server-side) | `src/app/api/keys/[keyId]/route.ts` |
| `guest_board_imported` | Guest converted their local board to an authenticated account (server-side) | `src/app/api/guest/import/route.ts` |
| `export_prompt_copied` | User copied the AI prompt export to clipboard | `src/components/modals/export-modal.tsx` |
| `ai_title_generated` | AI generated a task title from description (server-side) | `src/app/api/tasks/ai-title/route.ts` |
| `agent_task_created` | AI agent created a task via bridge API (server-side) | `src/app/api/bridge/tasks/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard – Analytics basics**: https://us.posthog.com/project/386478/dashboard/1480643
- **Signup to First Task Funnel**: https://us.posthog.com/project/386478/insights/IBoJD7i0
- **New Signups Over Time**: https://us.posthog.com/project/386478/insights/1ITrM7EV
- **Tasks Created (Human vs Agent)**: https://us.posthog.com/project/386478/insights/5ydUaUnb
- **API Key Creation (Agent Adoption)**: https://us.posthog.com/project/386478/insights/IQWZxn8L
- **Export Prompt Copied**: https://us.posthog.com/project/386478/insights/UYU3zgOl

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
