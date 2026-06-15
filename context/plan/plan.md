# Hackathon Backend — Implementation Plan

## What we are building

A clean NestJS hackathon management API for a YouTube course project. Three modules: Users
(auth via Better Auth), Hackathons (public browsing, admin-managed CRUD, participant join),
and Submissions (authenticated file upload with async email via BullMQ). The focus is on
teaching real NestJS patterns — guards, roles, interceptors, queues — without over-engineering.

---

## Language agreed on

| Term | Definition |
|---|---|
| **PARTICIPANT role** | Default role assigned at registration. Not tied to joining a specific hackathon. |
| **HackathonParticipant** | The DB join record created when a user joins a hackathon. Distinct from the role. |
| **isActive** | Manual admin toggle. Independent of `startsAt`/`endsAt`. Both must pass for submissions to be accepted. |
| **Processing** | Removed from vocabulary. BullMQ's only job is sending the email notification after submission. |

---

## Decisions made

1. **Public routes** — `GET /hackathon`, `GET /hackathon/:id`, and `GET /hackathon/:id/participants` require no auth. All write operations (create, update, delete, join, submit) require login.

2. **Submission status** — Change enum to `UNDER_REVIEW` (default on submit) | `ACCEPTED` | `REJECTED`. Admin updates via `PATCH /submission/:id/status`. Remove `PROCESSING`, `COMPLETED`, `FAILED`.

3. **File storage** — Write file directly to final path in the service. No temp directory, no file rename logic in the queue processor.

4. **BullMQ** — Queue sends submission confirmation email only. Processor is a simple mail sender, nothing else.

5. **Hackathon creation** — Uncomment `@Roles('ADMIN')` on `POST /hackathon/create`. Only admins create, update, and delete hackathons.

6. **Participants endpoint** — Add `GET /hackathon/:id/participants`. Public route, single Prisma include query.

---

## API surface (final)

### Auth (Better Auth — no changes)
```
POST /api/auth/sign-up
POST /api/auth/sign-in
POST /api/auth/sign-out
```

### User
```
GET  /user/me          → auth required
GET  /user             → ADMIN only
GET  /user/:id         → auth required
```

### Hackathon
```
GET    /hackathon                        → public
GET    /hackathon/:id                    → public
GET    /hackathon/:id/participants       → public  ← NEW
POST   /hackathon/create                 → ADMIN only
PATCH  /hackathon/update/:id             → ADMIN only
DELETE /hackathon/remove/:id             → ADMIN only
POST   /hackathon/:id/join               → PARTICIPANT (auth required)
```

### Submission
```
POST   /submission/:hackathonId/submit   → auth required
GET    /submission/all                   → auth required (admin sees all, user sees own)
GET    /submission/:id                   → auth required
PATCH  /submission/:id/status            → ADMIN only  ← NEW
```

---

## Changes to existing code

### 1. `prisma/models/submssion.prisma`
- Change enum: remove `PROCESSING`, `COMPLETED`, `FAILED` → add `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`
- Default status: `UNDER_REVIEW`
- Run migration after

### 2. `src/module/hackathon/hackathon.controller.ts`
- Remove `@UseGuards(AuthGuard, RolesGuard)` from class level
- Apply guards per-route on write endpoints only
- Uncomment `@Roles('ADMIN')` on `createHackathon`
- Add `GET /:id/participants` route

### 3. `src/module/hackathon/hackathon.service.ts`
- Replace `console.log` with `Logger`
- Add `getParticipants(hackathonId)` method

### 4. `src/module/submission/submission.service.ts`
- Remove temp file logic — write directly to final path
- Change initial status from `PROCESSING` to `UNDER_REVIEW`
- Add `updateStatus(id, status, userRole)` method for admin PATCH

### 5. `src/module/submission/submission.controller.ts`
- Add `PATCH /:id/status` route with `@Roles('ADMIN')`

### 6. `src/lib/queue/queue.processor.ts`
- Remove all file move / rename / directory logic
- Processor only calls `mailService.sendSubmissionProcessed`
- Remove `onFailed` temp file cleanup (no temp files anymore)

---

## Assumptions

- Join confirmation email stays sent directly in the service (not queued) — keeps the queue focused on one clear demo
- No submission delete endpoint — keeps scope tight for the video
- File size (10MB) and type validation stay as-is
- Expiry check (`endsAt < new Date()`) already exists in `joinHackathon` — same check needs to be added in `submission` service

---

## Build order

1. Update Prisma schema → run migration → verify generated types
2. Fix `hackathon.controller.ts` — guards, roles, add participants route
3. Add `getParticipants` to `hackathon.service.ts`
4. Simplify `submission.service.ts` — remove temp logic, add expiry check, add `updateStatus`
5. Add `PATCH /:id/status` to `submission.controller.ts`
6. Simplify `queue.processor.ts` — email only
