# Auth — Implementation Plan

## What we are building

Replace Better Auth with a clean JWT implementation using `@nestjs/passport` + `passport-jwt`
+ `@nestjs/jwt`. Two endpoints: sign-up and sign-in, both returning `{ access_token }`.
Sign-up creates the user and returns a JWT immediately. All existing protected routes swap
to the new `JwtAuthGuard`. Role is embedded in the JWT payload so `RolesGuard` works
without a DB call per request.

---

## Language agreed on

| Term | Definition |
|---|---|
| **JWT** | Stateless signed token. No refresh tokens. 7-day expiry. |
| **Sign-up** | Creates user with hashed password + returns JWT immediately (logged in on register) |
| **Role in token** | `{ sub, email, role }` embedded in payload — read from token, no DB fetch per request |
| **Response shape** | `{ access_token: string }` only |

---

## Decisions made

- No refresh tokens — too complex for course scope, adds DB storage + rotation logic
- 7-day JWT expiry — long enough for testing, simple to explain
- Role embedded in JWT payload — no DB hit on every authenticated request
- Sign-up returns `access_token` immediately — no separate sign-in step needed after register
- `req.user` shape: `{ id, email, role }` — consistent across all controllers

---

## What gets removed

| What | Why |
|---|---|
| `@thallesp/nestjs-better-auth` package | Replaced by JWT auth |
| `auth.ts` (root) | Better Auth config file, no longer needed |
| `Session`, `Account`, `Verification` Prisma models | Better Auth created these, not needed anymore |
| Better Auth wiring in `app.module.ts` | Replaced by `AuthModule` |

---

## What gets added / changed

| File | Action |
|---|---|
| `prisma/models/user.prisma` | Add `password String` field. Remove `Session`, `Account`, `Verification` models. |
| `src/module/auth/` | New module — see structure below |
| `src/module/hackathon/hackathon.controller.ts` | Swap `AuthGuard` from better-auth → `JwtAuthGuard` |
| `src/module/submission/submission.controller.ts` | Swap `AuthGuard` from better-auth → `JwtAuthGuard` |
| `src/module/user/user.controller.ts` | Swap `AuthGuard`, remove `@Session()` decorator, read from `req.user` |
| `src/app.module.ts` | Remove Better Auth config, register `AuthModule` |
| `src/common/types/express.d.ts` | Update `req.user` type: `{ id: string; email: string; role: string }` |

---

## New auth module structure

```
src/module/auth/
  auth.module.ts
  auth.controller.ts        → POST /auth/sign-up, POST /auth/sign-in
  auth.service.ts           → signUp(), signIn()
  dto/
    sign-up.dto.ts          → name, email, password
    sign-in.dto.ts          → email, password
  strategies/
    jwt.strategy.ts         → validates token, attaches { id, email, role } to req.user
  guards/
    jwt-auth.guard.ts       → extends AuthGuard('jwt')
```

---

## JWT payload shape

```ts
// Encoded in token
{ sub: string, email: string, role: string }

// Attached to req.user after validation
{ id: string, email: string, role: string }
```

---

## New API endpoints

```
POST /auth/sign-up   → { name, email, password } → { access_token }
POST /auth/sign-in   → { email, password }        → { access_token }
```

---

## Environment variables to add

```env
JWT_SECRET="your-jwt-secret"
JWT_EXPIRES_IN="7d"
```

---

## Build order

1. Update `prisma/models/user.prisma` — add `password`, remove Better Auth models
2. Run migration → verify generated types
3. Install: `@nestjs/passport` `passport` `passport-jwt` `@nestjs/jwt` `bcryptjs` `@types/passport-jwt` `@types/bcryptjs`
4. Uninstall: `@thallesp/nestjs-better-auth`
5. Build auth module in this order:
   - `jwt.strategy.ts`
   - `jwt-auth.guard.ts`
   - `sign-up.dto.ts` + `sign-in.dto.ts`
   - `auth.service.ts`
   - `auth.controller.ts`
   - `auth.module.ts`
6. Register `AuthModule` in `app.module.ts`, remove Better Auth
7. Update `express.d.ts` with new `req.user` type
8. Swap guards in `hackathon.controller.ts`, `submission.controller.ts`, `user.controller.ts`
9. Delete `auth.ts` from project root
10. Test: sign-up → sign-in → protected route → roles
