# AGENTS.md
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project goal
Build an MVP for a learning app where users create hierarchical subject trees, attach questions, answer in free-form, receive AI grading, and review with spaced repetition.

## Tech stack
- Next.js
- TypeScript
- Postgres
- Prisma
- Tailwind
- NextAuth or Clerk

## Rules
- Prioritize simple MVP architecture.
- Do not implement sharing, multiplayer, or community features.
- Use a strict parent-child node hierarchy.
- Use server actions or API routes consistently.
- Keep LLM integrations behind a dedicated service layer.
- Use structured JSON outputs for LLM grading.
- Write code that is easy to extend, not overengineered.

## Workflow
- Before coding, summarize the task and implementation plan.
- Write TESTS First.
- Then implement only the requested milestone, make sure to pass the tests.
- After coding, list changed files and any follow-up tasks.
- Run tests and lint before finishing.