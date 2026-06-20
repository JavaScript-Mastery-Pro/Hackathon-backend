# Project Goal

## What this is

A NestJS backend API for a **JavaScript Mastery YouTube course**. The course is split into two parts:

1. **NestJS Crash Course** (~40-60 min) — teaches NestJS concepts: modules, controllers, services, guards, decorators, interceptors, middleware. Auth is explained conceptually but not fully implemented from scratch.
2. **Project Build** (~40 min) — builds this Hackathon Backend as a practical demonstration of everything taught in Part 1.

This file exists to preserve the project goal and constraints so any new session can continue without re-explaining the context.

---

## Why we are building this

To give students a **real, working NestJS project** they can follow along with and reference. The project must:

- Be simple enough to build on camera in ~40 minutes
- Use real-world patterns (guards, role-based access, file uploads, email notifications)
- Not be over-engineered or include things that don't make sense
- Be something students can understand and extend on their own

---

## What the project does

A hackathon management platform with:

- **Auth** — sign up, sign in, role-based access (ADMIN / PARTICIPANT)
- **Hackathons** — CRUD (admin only), public listing, join (participants)
- **Submissions** — file upload tied to a hackathon, status tracking, admin review
- **Users** — profile, admin user list
- **Email** — confirmation on join, notification on submission
- **Security** — Arcjet for rate limiting and threat protection

---

## Tech stack

- NestJS + TypeScript
- Prisma + PostgreSQL
- Better Auth (email/password) — chosen over JWT Passport to save ~15 min of video time
- Nodemailer (email, called directly — no queue)
- Arcjet (security)

---

## Key decisions for the video

### Auth — Better Auth (not JWT Passport)

JWT Passport takes ~20-25 min of video time to explain and implement (strategy, guard, service, DTOs, token signing). Better Auth takes ~8-10 min (install, `auth.ts` config, register in AppModule). For a 40-min project video, this difference is critical.

Better Auth NestJS integration docs: https://better-auth.com/docs/integrations/nestjs
Package: `@thallesp/nestjs-better-auth`
Note: requires `bodyParser: false` in main.ts — Better Auth handles body parsing internally, other endpoints are unaffected.

### BullMQ — REMOVED COMPLETELY

Originally used to process file uploads and send emails in the background. After review:
- The file move (temp → final) is trivially fast and doesn't need a queue
- The only real use case was the email notification
- Keeping BullMQ requires students to set up Redis locally just to run the project
- Costs ~10 min of video explanation for minimal educational value

**Decision:** Cut BullMQ and Redis entirely. Send emails synchronously inline in the service. One `await mailService.send...()` call is enough.

### Submission status

- ~~PROCESSING / COMPLETED / FAILED~~ (removed — made no sense without real processing)
- **UNDER_REVIEW** (default on submit) | **ACCEPTED** | **REJECTED**
- Admin can update via `PATCH /submission/:id/status`
- This is realistic and teaches a practical pattern

### File uploads

- Write file directly to final path on the request thread (no temp directory)
- Categorise by file extension into subdirectories under `uploads/`
- Max 10MB, validated file types

### Public routes (no auth required)

- `GET /hackathon` — list all hackathons
- `GET /hackathon/:id` — get one hackathon
- `GET /hackathon/:id/participants` — list participants

---

## What to cut / simplify (scope boundaries)

| Cut | Reason |
|---|---|
| BullMQ + Redis | Adds complexity, requires local Redis, minimal educational value |
| JWT Passport auth | Takes too long in the video; Better Auth achieves same result faster |
| Temp file upload pattern | Unnecessary without a queue |
| Refresh tokens | Out of scope for a simple project |
| Email verification | Better Auth can handle it but adds flow complexity |
| Submission delete endpoint | Not needed for the core flow |
| AI scoring / code analysis | Good idea but makes the project too big |

---

## API surface (final)

```
POST   /api/auth/sign-up              → register
POST   /api/auth/sign-in              → login

GET    /user/me                       → auth required
GET    /user                          → ADMIN only
GET    /user/:id                      → auth required

GET    /hackathon                     → public
GET    /hackathon/:id                 → public
GET    /hackathon/:id/participants    → public
POST   /hackathon/create              → ADMIN only
PATCH  /hackathon/update/:id          → ADMIN only
DELETE /hackathon/remove/:id          → ADMIN only
POST   /hackathon/:id/join            → PARTICIPANT (auth required)

POST   /submission/:hackathonId/submit → auth required, file upload
GET    /submission/all                → auth required (admin sees all)
GET    /submission/:id                → auth required
PATCH  /submission/:id/status         → ADMIN only
```

---

## Current codebase state

The codebase currently has **JWT Passport auth** implemented (not Better Auth). This needs to be reverted before recording the video. The plan files in `context/plan/` track all build steps.

**To start a new session:** read `CLAUDE.md` + `context/plan/progress-tracker.md` + this file.
