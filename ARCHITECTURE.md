# TOLO Architecture

## Purpose
TOLO is a concept-based learning app.

Users:
- create subjects
- add concepts to a subject
- optionally organize concepts with tags
- answer concepts in free-form
- receive LLM grading, hints, and answer reveals
- review concepts over time with spaced repetition

This document explains the current architecture of the codebase as it exists today.

## High-Level Structure
The app is built as a Next.js App Router application with four main layers:

1. UI layer
- `app/`
- Server-rendered pages for routing and initial data loading
- Client components for interactive quiz behavior

2. Action layer
- `app/actions/`
- Server Actions for mutations and interactive workflows

3. Service layer
- `lib/`
- LLM integrations, review scheduling, tree logic, validation, and Prisma access

4. Persistence layer
- `prisma/schema.prisma`
- PostgreSQL via Prisma

## Current Product Model
The current product model is:

- `Subject`
- `Concept`
- optional `Tags`

There is still a `Node` table with `NodeLevel` values `SUBJECT`, `TOPIC`, and `SUBTOPIC`, but the current application flow is concept-first and subject-centric:

- subjects are the active top-level containers
- concepts currently attach directly to a subject
- tags are used for organization inside a subject

The older topic/subtopic hierarchy remains in the schema and parts of the codebase, but it is not the primary interaction model anymore.

## Key Directories

### `app/`
Contains routes, page components, and server actions.

Important routes:
- `app/page.tsx`
  - landing page
- `app/dashboard/page.tsx`
  - authenticated entrypoint for subject management and review queue
- `app/subject/[subjectId]/page.tsx`
  - main subject page
- `app/quiz/[questionId]/page.tsx`
  - main concept quiz page
- `app/quiz/generated/[generatedQuestionId]/page.tsx`
  - generated study-lens question quiz page
- `app/compare/[conceptId]/page.tsx`
  - compatibility redirect only; compare is retired

### `app/actions/`
Contains server-side mutations and interactive workflows:

- `auth.ts`
  - signup, login, logout
- `nodes.ts`
  - subject creation/update/delete
- `concepts.ts`
  - concept creation, related concept add, tag add, review reset, delete
- `quiz.ts`
  - hint, reveal, submit, generated-question persistence, review-state updates

### `lib/`
Contains reusable logic and services:

- `lib/prisma.ts`
  - Prisma client singleton
- `lib/auth/`
  - validation and session claim helpers
- `lib/llm/`
  - OpenAI request helpers and task-specific LLM flows
- `lib/quiz/`
  - quiz constants, state types, generated-question sanitization
- `lib/review/`
  - spaced repetition scheduler, display helpers, queue queries
- `lib/tree/`
  - node rules and subject tree queries

### `prisma/`
Contains schema and migrations.

## Authentication
Authentication is handled with NextAuth credentials auth in `auth.ts`.

Current behavior:
- session strategy is JWT
- login page is `/login`
- credentials are validated with Zod
- passwords are compared with `bcryptjs`
- session claims are normalized in `lib/auth/session.ts`

Most server pages and actions call `auth()` directly and redirect to `/login` if the user is not authenticated.

## Data Model

### `User`
Stores:
- login credentials
- subscription status

Also owns:
- nodes
- concepts
- review states
- LLM usage events

### `Node`
Represents the subject tree.

Current practical use:
- subjects are active
- topics/subtopics are legacy/optional hierarchy support

Key fields:
- `userId`
- `parentId`
- `title`
- `level`

### `Concept`
Represents the primary learnable unit.

Important note:
- `Concept.title` is mapped to the old database column `body`
- this means the code uses concept terminology, but the underlying column still comes from the older question-centric schema

Concept owns:
- generated study-lens questions
- review state
- concept-tag relationships

### `Tag`
Represents an organizational label scoped to a subject.

Tags are not global.
They are unique by `(subjectId, normalizedName)`.

### `ConceptTag`
Join table between concepts and tags.

### `GeneratedQuestion`
Stores the five attached study-lens prompts for a concept:
- `EXPLAIN`
- `ANALYZE`
- `EVALUATE`
- `APPLY`
- `TEACH`

Important note:
- `GeneratedQuestion.conceptId` is mapped to the legacy database column `questionId`

### `ReviewState`
Stores the spaced repetition state for a concept.

Important note:
- `ReviewState.conceptId` is also mapped to the legacy `questionId` column

Fields include:
- `status`
- `intervalDays`
- `repetitionCount`
- `lastAnsweredAt`
- `lastReviewedAt`
- `lastQuizAccessedAt`
- `nextReviewAt`

### `LlmUsageEvent`
Tracks LLM usage for daily free-tier limits.

Types:
- `GRADE`
- `HINT`
- `QUESTION_GENERATION`

## Architectural Reality: Legacy Mapping
This codebase has gone through a model shift from “questions” to “concepts”.

That shift is only partially reflected in the database.

Examples:
- `Concept` maps `title -> body`
- `GeneratedQuestion.conceptId -> questionId`
- `ReviewState.conceptId -> questionId`
- the route is still `/quiz/[questionId]` even though it loads a concept

This is intentional technical debt.
It keeps the current app working without a full destructive rename of the underlying database yet.

Any future schema cleanup should treat this as a migration project, not a simple rename.

## Rendering Model

### Server-rendered pages
Most top-level pages are async server components that:
- authenticate the user
- load data with Prisma
- assemble initial props
- render client components only where interaction is required

Examples:
- `app/dashboard/page.tsx`
- `app/subject/[subjectId]/page.tsx`
- `app/quiz/[questionId]/page.tsx`

### Client-interactive quiz session
The main interactive study flow lives in:
- `app/components/quiz/quiz-session.tsx`

This component uses:
- `useActionState`
- `runQuizInteractionAction`

That gives the app a simple server-action driven state loop:
- render prompt
- submit form
- server action grades or generates hint
- client re-renders with returned state

This is the main interaction pattern in the app.

## Main Application Flows

### 1. Subject creation
Flow:
- user submits a form on dashboard
- `createNodeAction` runs
- validation happens in `lib/auth/validation.ts`
- tree constraints are checked in `lib/tree/rules.ts`
- subject is created through Prisma
- dashboard is revalidated

### 2. Concept creation
Flow:
- user submits `CreateConceptSection`
- `createConceptAction` runs
- node ownership is checked
- concepts currently must attach to a `SUBJECT` node
- tags are parsed, normalized, and `connectOrCreate`d
- a `ReviewState` is created immediately for the concept

### 3. Subject page rendering
Flow in `app/subject/[subjectId]/page.tsx`:
- authenticate user
- load subject
- load tag summaries
- load concept list
- load generated question scores
- load review metadata
- load review queue summary for the subject
- render:
  - subject sidebar
  - create concept form
  - grouped concept list
  - review launch card

### 4. Main concept quiz
Flow in `app/quiz/[questionId]/page.tsx`:
- authenticate user
- load concept by id
- ensure/update `ReviewState.lastQuizAccessedAt`
- render quiz page shell
- pass prompt info into `QuizSession`

### 5. Quiz interaction
Flow in `app/actions/quiz.ts`:
- validate interaction payload
- load quiz state for the prompt
- branch by `intent`

Supported intents:
- `hint`
- `reveal`
- `submit`

#### Hint flow
- enforce daily LLM limit
- call `generateQuestionHint`
- log `LlmUsageEvent(HINT)`
- return updated client state

#### Reveal flow
- only available after 3 hints
- enforce daily LLM limit
- call `revealQuestionAnswer`
- log `LlmUsageEvent(HINT)`
- return updated client state

#### Submit flow
- enforce daily LLM limit
- call `gradeQuestionAttempt`
- log `LlmUsageEvent(GRADE)`
- update spaced repetition state
- persist main concept score or generated question score
- create generated study-lens questions if they do not already exist
- return feedback plus a suggested related concept

### 6. Generated question quiz
Generated questions have their own route:
- `/quiz/generated/[generatedQuestionId]`

They reuse the same quiz session pattern but:
- the prompt comes from `GeneratedQuestion.body`
- they do not generate another nested set of generated questions

## LLM Architecture
The LLM layer is intentionally isolated under `lib/llm/`.

### Shared request layer
- `lib/llm/request.ts`
  - timeout wrapper around `fetch`
- `lib/llm/openai.ts`
  - JSON-only OpenAI chat completion helper
  - common error mapping to `timeout`, `http_error`, `invalid_response`, `network_error`
- `lib/llm/result.ts`
  - shared result type

### Task-specific LLM functions
- `grade-question-attempt.ts`
  - grades a concept definition
  - returns:
    - score
    - feedback
    - correction
    - related concept
    - generated study-lens questions
- `generate-question-hint.ts`
  - produces progressive hints
- `reveal-question-answer.ts`
  - reveals a concise answer after enough hints

### LLM usage limiting
`lib/llm/usage-limit.ts` is the central rate-limit service.

Current behavior:
- free users get 3 LLM calls per day
- paid users are unlimited
- hints, grading, and question generation share the same pool

## Review Queue Architecture
The review system is separate from the LLM layer.

### Scheduler
`lib/review/scheduler.ts`

This is a pure function layer that decides:
- next interval
- next status
- whether a review is due to advance

Current interval sequence:
- `1, 2, 3, 7, 14, 30, 60, 120`

### Review service
`lib/review/service.ts`

Responsibilities:
- ensure missing `ReviewState` rows exist
- count due concepts
- fetch due concepts
- update review state from a graded attempt

This service is used by:
- dashboard review queue
- subject review cards
- quiz submission flow

## Tree and Organization Architecture
`lib/tree/` now acts mostly as subject-management infrastructure.

### `lib/tree/service.ts`
Current responsibilities:
- fetch user subjects
- fetch subject shell data
- fetch user subscription status
- fetch node ownership

### `lib/tree/rules.ts`
Contains constraints for how nodes can be created.

Even though the current app is concept-first, the tree layer still exists because:
- subjects are modeled as nodes
- older hierarchical code paths still exist
- topic/subtopic support has not been fully removed from schema-level assumptions

## UI Composition

### Dashboard
- `DashboardSidebar`
- review queue card
- create-subject form

### Subject page
- `SubjectTocSidebar`
- `CreateConceptSection`
- `GroupedConceptList`
- `ReviewLaunchCard`

### Concept list item
`ConceptListItem` is an important UI aggregation component.

It shows:
- concept title
- tags
- last answered / next review
- settings menu
- study-lens score grid

It no longer shows compare.

### Quiz UI
Main pieces:
- `QuizHeader`
- `QuizSession`
- `QuizBody`
- `QuestionCard`
- `AnswerCard`
- `FeedbackCard`
- `StatusBanners`
- `RelatedConceptCard`
- `GeneratedQuestionSuggestions`

The quiz UI is intentionally split into small pieces, but the server-action state flow is centralized in `QuizSession`.

## Testing Strategy
Tests live under `tests/` and are primarily Vitest unit/component tests.

The suite focuses on:
- server actions
- schema-driven validation behavior
- page render behavior
- quiz interaction behavior
- review scheduling
- LLM response parsing/sanitization

This is not currently an end-to-end browser test architecture.
It is mostly:
- unit tests
- server-action tests
- static markup component tests

## Important Technical Tradeoffs

### 1. Concept-first code on top of question-era storage
This is the biggest architectural compromise in the codebase.

Pros:
- allowed the app to move product language quickly
- minimized destructive migrations

Cons:
- naming mismatch between code and database
- more cognitive load for future maintenance

### 2. Server Action-centric interaction model
Pros:
- simple mental model
- less client-side state machinery
- good fit for auth + Prisma mutations

Cons:
- interaction state is spread between client-local state and server responses
- debugging can be less obvious than a dedicated API/state client

### 3. JSON-only LLM contracts
Pros:
- deterministic parsing
- easier validation
- easier testing

Cons:
- fragile if prompts drift
- requires careful schema enforcement in every LLM task

### 4. Subject + tag organization
Pros:
- simpler than mandatory topic/subtopic trees
- easier concept capture

Cons:
- the old node hierarchy still exists in schema/code
- architecture is partly between two models

## Current Deprecated/Retired Areas

### Compare
Concept compare has been retired.

Current state:
- compare UI entrypoints are removed
- compare runtime code is removed
- `/compare/[conceptId]` exists only to redirect old links safely
- the retirement migration drops compare tables and enum

### Topic/Subtopic-first navigation
The system still has `TOPIC` and `SUBTOPIC` in the schema, but the active user flow is subject -> concept + tags.

## Recommended Future Cleanup Areas

1. Fully rename legacy question-era database columns
- remove `@map("body")`
- remove `@map("questionId")`
- align route params and internal identifiers with `concept`

2. Either fully remove topic/subtopic from the data model or restore them intentionally
- right now they are partly legacy, partly supported

3. Decide whether generated study-lens questions remain a persisted model or become fully derived

4. Add stronger end-to-end testing around the quiz flow

5. Replace remaining “question” naming in variable names and route segments where practical

## Runtime Summary
At runtime, the system works like this:

1. Next.js page loads server-side data through Prisma.
2. Interactive study flows hand off to client components using `useActionState`.
3. Server actions validate input with Zod.
4. Actions call dedicated LLM services when needed.
5. Prisma persists concepts, generated questions, review state, tags, and usage logs.
6. Review scheduling is computed in a separate service layer.
7. Pages are revalidated after mutations so subject/dashboard views stay fresh.

That is the current architecture in practical terms.
