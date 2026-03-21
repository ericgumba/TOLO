Product vision

A web app that helps users learn any subject by organizing knowledge into a hierarchy, generating or storing questions at each node, quizzing the user with active recall, grading free-form answers with an LLM, asking follow-up questions to probe depth, and scheduling future reviews with spaced repetition.

Core product concept

The app is built around a knowledge tree.

Example:

Subject: Operating Systems

Topic: Virtualization

Subtopic: Processes

Concept: Context Switch

Concept: Process Control Block

Each node can contain:

user-authored questions

LLM-generated questions

answer history

mastery state

review schedule

The user studies by clicking a node and entering a quiz session. The system asks questions, evaluates answers, gives corrections, asks follow-ups, and updates mastery + next review date.

MVP goals

The MVP should prove three things:

Users want to build their own concept trees.

Users find LLM grading and follow-up questioning valuable.

Spaced repetition increases repeat usage.

The MVP should not try to solve community sharing, classrooms, collaborative editing, or advanced analytics yet.

User stories
Knowledge organization

As a user, I can create a subject.

As a user, I can add child nodes under any node.

As a user, I can rename, move, and delete nodes.

As a user, I can see my subject/topic hierarchy in a sidebar or tree view.

Question creation

As a user, I can manually create questions for a node.

As a user, I can ask the LLM to generate questions for a node based on the node title, parent node title, and so on.

As a user, I can edit generated questions before saving them.

As a user, I can click “Quiz me” on a node.

As a user, the app asks one question at a time.

As a user, I can answer in free-form text.

As a user, the LLM grades my answer.

As a user, I get:

score

what I got right

what I missed

a corrected answer

As a user, I can click “Ask a deeper follow-up.”

As a user, the system can automatically ask follow-up questions based on weak spots.

As a user, I can continue or end the session.

Spaced repetition

As a user, questions I miss should come back sooner.

As a user, questions I answer well should come back later.

As a user, I can see a review queue for today.

As a user, I can review due questions across all subjects or within one subject.

Progress tracking

As a user, I can see:

questions answered

average score

weak topics

due today

streak or recent activity

As a user, I can see mastery at each node.

Core entities
1. User

Fields:

id

email

password_hash or auth_provider_id

subscription_status

created_at

updated_at

2. Node

Represents any level in the hierarchy.

Fields:

id

user_id

parent_id nullable

title

description

depth

position

created_at

updated_at

archived_at nullable

Examples of nodes:

“Computer Science”

“Operating Systems”

“Virtual Memory”

“Page Faults”

3. Question

Fields:

id

node_id

user_id

body

source (user or llm)

active boolean

created_at

updated_at

4. StudySession

Fields:

id

user_id

node_id nullable

started_at

ended_at


total_questions

average_score

5. QuestionAttempt

Fields:

id

study_session_id

question_id

user_answer

llm_score

llm_feedback

llm_correction

confidence_self_rating nullable

answered_at

6. FollowUpQuestion

Could either be its own table or stored as attempts linked to parent attempts.

Fields:

id

parent_attempt_id

generated_question

user_answer

llm_score

llm_feedback

llm_correction

answered_at

7. ReviewState

Tracks spaced repetition per question.

Fields:

id

question_id

user_id

easiness_factor or mastery_score

interval_days

repetitions

last_reviewed_at

next_review_at

last_score

status (new, learning, review, mastered, struggling)

Product behavior
1. Node hierarchy behavior

A node can have unlimited nesting depth.

Each node page should show:

breadcrumb

child nodes

attached questions

mastery summary

quiz button

generate questions button

When quizzing a node, user can choose:

only this node’s questions

include descendants

This is important. Otherwise the tree becomes annoying.

2. Question generation behavior

When user clicks “Generate questions,” the app sends the node title, ancestry, to the LLM.

Prompt goal:

generate useful active-recall questions

vary difficulty

avoid duplicates

include conceptual understanding, not just memorization

Example question types:

Define X in your own words.

Why does X matter?

Compare X vs Y.

What happens if X fails?

Give a real-world analogy for X.

Walk through the process step by step.

User should review generated questions before saving.

3. Grading behavior

The LLM should not just give “correct/incorrect.”

It should produce structured output like:

score from 1–5

correctness summary

missing concepts

misconceptions

ideal concise answer

confidence in evaluation

This makes the system more trustworthy and easier to display.

Suggested score meaning:

5 = complete and accurate

4 = mostly right, minor omission

3 = partially right, important gap

2 = mostly incorrect/confused

1 = wrong or no meaningful answer

4. Follow-up behavior

Follow-up is one of the most important features.

Two modes:

Automatic follow-up

After grading, if the score is below threshold or important gaps exist, the system generates a follow-up question targeting the missing concept.

Example:
Question: What is a context switch?
User answer misses saving registers.

Follow-up:
What specific CPU state must the OS save before switching to another process?

Manual follow-up

User clicks “Ask deeper question.”

System generates a deeper question even if original answer was good.

Example:
Why does frequent context switching hurt performance?

This gives the Socratic feel.

5. Spaced repetition behavior

For MVP, keep it simple.

Use a lightweight review algorithm 1 day -> 3 days -> 7 days and then double the length after every review

Then after more data, you can move toward SM-2 style logic.

A simple version is better than overcomplicated “learning science” early.

MVP screens
1. Landing page

Purpose:

explain value prop

allow signup/login

show demo flow

Headline example:
Build your own knowledge tree. Test yourself with AI. Review what you forget.

2. Dashboard

Shows:

subjects

due today count

recent activity

weak topics

button to create subject

3. Subject / Node page

Shows:

node title

child nodes

question list

mastery summary

buttons:

add child node

add question

generate questions

quiz this node

review due questions

4. Quiz screen

Shows:

current question

answer textarea

submit button
 
next question button

After submit:

score

feedback

corrected answer

follow-up question button

continue button

5. Review queue screen

Shows all questions due today, possibly filtered by subject.

6. Progress screen

Shows:

due today

total answered

average score

weakest nodes

strongest nodes

recent sessions

Suggested UX flow
Creating knowledge

User creates subject: “Operating Systems”

User adds child: “Virtualization”

User adds child: “Processes”

User clicks generate questions

User reviews/edit/saves questions

Studying

User clicks “Quiz me”

App asks question

User answers

LLM grades

App updates review schedule

User optionally asks deeper follow-up

Continue to next question

Daily review

User logs in

Dashboard says “12 questions due today”

User enters review mode

Reviews across subjects

App reschedules based on performance

Free vs paid user limits

Free users:

Can create up to 1 subject.

Within that subject, can create up to 3 topics.

Within each topic, can create up to 3 subtopics.

Can receive up to 10 LLM feedback responses per day (grading/follow-up feedback calls) or can click generate LLM questions.



Paid users:

Can create unlimited subjects.

Can create unlimited topics and subtopics.

Can receive unlimited LLM feedback responses.

Non-goals for MVP

Avoid these initially:

sharing trees publicly

collaborative editing

classroom/teacher mode

importing PDFs and auto-creating trees

voice mode

flash animations/gamification overload

advanced concept maps with graph edges beyond parent-child

community marketplace for question sets

mobile app

live chat tutor

Those can all come later.

Functional requirements
Auth

signup

login

logout

password reset

email verification optional for MVP

Hierarchy management

create/update/delete nodes

drag/drop or move node later

fetch full tree efficiently

Question management

create/edit/delete questions

generate questions via LLM

attach question to node

mark archived

Quiz engine

fetch questions by node

randomize order

display one at a time

accept free-form answer

send grading request

persist result

Follow-up engine

generate follow-up from original question + answer + grading result

persist follow-up result

Review engine

compute due questions

update next review date after attempt

dashboard counter for due today

Progress tracking

per-node stats

per-question stats

session stats

Non-functional requirements
Performance

tree page should load quickly for typical personal use

quiz submission should feel responsive

LLM calls should ideally return within a few seconds

Reliability

do not lose question history

save attempts persistently

Security

secure auth

protect private trees

rate limit LLM endpoints

validate ownership of node/question access

Cost control

only call LLM when needed

generate questions in batches

structure grading prompts tightly

avoid very large context windows

LLM responsibilities

The LLM should do only the tasks it’s uniquely good at:

Generate questions

Grade free-form answers

Generate follow-up questions

Provide corrections/explanations

The app should not use LLM for:

storing structure

deciding auth

computing simple due dates

basic analytics

Keep deterministic logic outside the LLM.

Example prompts
Question generation prompt

Input:

node title

parent chain

Output:
JSON array of questions with fields:

body

type

difficulty

Prompt intent:
Generate 5 high-quality active-recall questions for this concept. Mix definition, explanation, comparison, and application questions. Avoid trivia and yes/no questions.

Grading prompt

Input:

question

user answer

Output JSON:

score_1_to_5

what_is_correct

what_is_missing

misconceptions

concise_ideal_answer

recommended_followup_focus

Follow-up generation prompt

Input:

question

user answer

grading result

Output:

follow_up_question

Prompt intent:
Ask one targeted question that probes the biggest missing concept.

Suggested initial database schema

A relational DB is fine.

Tables:

users

nodes

questions

study_sessions

question_attempts

review_states

Relations:

users 1:N nodes

nodes self-referential parent-child

nodes 1:N questions

users 1:N study_sessions

study_sessions 1:N question_attempts

questions 1:1 review_states per user

Suggested API endpoints
Auth

POST /api/signup

POST /api/login

POST /api/logout

Nodes

GET /api/nodes/tree

POST /api/nodes

PATCH /api/nodes/:id

DELETE /api/nodes/:id

Questions

POST /api/questions

PATCH /api/questions/:id

DELETE /api/questions/:id

POST /api/questions/generate

Quiz

POST /api/quiz/start

POST /api/quiz/submit-answer

POST /api/quiz/follow-up

Review

GET /api/review/due

POST /api/review/reschedule

Analytics

GET /api/progress/summary

GET /api/progress/node/:id

Recommended MVP tech stack

For speed:

Next.js

Postgres

Prisma or Drizzle

NextAuth or Clerk or Supabase Auth

OpenAI API for question generation/grading

Stripe later if monetized

Vercel for hosting

Critical product decisions

There are a few decisions you should make early.

1. Tree only, not graph

Use strict parent-child hierarchy first. Do not support arbitrary cross-links yet.

2. User-curated generation

LLM generates candidate questions, but user approves them before saving.

3. Structured grading output

Do not store only plain-text feedback. Store score + feedback fields separately.

4. Question-level repetition

Schedule reviews per question, not just per topic.

5. Include descendants toggle

When quizzing a node, user must be able to include children.

Risks
1. LLM grading inconsistency

Mitigation:

structured prompt

narrow rubric

show correction, not just score

maybe allow “regrade” later

2. Too much complexity in the tree

Mitigation:

great UX

easy add child

breadcrumbs

collapse/expand tree

search later

3. Overbuilding spaced repetition

Mitigation:

use simple review intervals first

4. Cost explosion

Mitigation:

batch question generation

only grade on submit

cap follow-ups

Success metrics for MVP

Track:

number of nodes created per active user

number of questions created/generated

percent of users who complete first quiz session

average session length

repeat study sessions per week

due questions reviewed per day

retention after 7 days

Most important metric:
Do users come back to review?

That’s the whole bet.

Recommended MVP milestone plan
Milestone 1: Static structure

auth

create subjects/topics/subtopics

question CRUD

Milestone 2: Quiz loop

quiz screen

answer submission

LLM grading

feedback display

Milestone 3: Follow-up loop

generate deeper questions

save follow-up attempts

Milestone 4: Spaced repetition

due queue

review schedule updates

dashboard counts

Milestone 5: Progress

mastery summaries

weak topic highlights

One-sentence product spec 
