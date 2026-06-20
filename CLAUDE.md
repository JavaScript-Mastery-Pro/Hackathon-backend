# Hackathon Backend

NestJS course project for JavaScript Mastery YouTube channel.

## Stack
- NestJS + TypeScript, Prisma + PostgreSQL, BullMQ + Redis
- JWT auth (`@nestjs/passport` + `passport-jwt`) — replacing Better Auth
- Nodemailer (email), Arcjet (security)

## Commands
```
npm run start:dev     # dev server (port 8080)
npm run db:migrate    # run migrations
npm run db:generate   # regenerate Prisma client
npm run db:studio     # Prisma Studio
npm run build         # production build
```

## Structure
```
src/
  module/auth/        # JWT auth (sign-up, sign-in)
  module/hackathon/   # hackathon CRUD + join + participants
  module/submission/  # file upload + status management
  module/user/        # user profile + admin user list
  lib/bullmq/         # queue module
  lib/mail/           # Nodemailer service
  lib/queue/          # queue processor (email only)
  common/             # guards, decorators, interceptors, validators
```

## Key conventions
- Response shape: `{ message, data }` via `TransformInterceptor`
- Two roles: `ADMIN` | `PARTICIPANT` (default)
- `req.user` shape: `{ id, email, role }` (from JWT payload)
- Guards: `JwtAuthGuard` for auth, `RolesGuard` for role checks
- BullMQ queue name: `submission` — processor sends email only

## Plans & progress
- `context/plan/plan.md` — feature changes plan
- `context/plan/auth-plan.md` — auth migration plan
- `context/plan/build-plan.md` — ordered build steps
- `context/plan/progress-tracker.md` — ✅ check this first, update as you go
