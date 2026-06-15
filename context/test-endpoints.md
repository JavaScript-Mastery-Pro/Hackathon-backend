Auth

POST /auth/sign-up — body: { name, email, password }
POST /auth/sign-in — body: { email, password }
User

GET /user/me — Bearer token required
GET /user — ADMIN token required
GET /user/:id — Bearer token required
Hackathon

GET /hackathon — public, no token
GET /hackathon/:id — public, no token
GET /hackathon/:id/participants — public, no token
POST /hackathon/create — ADMIN token required
PATCH /hackathon/update/:id — ADMIN token required
DELETE /hackathon/remove/:id — ADMIN token required
POST /hackathon/:id/join — PARTICIPANT token required
Submission

POST /submission/:hackathonId/submit — Bearer token, multipart/form-data (file + title + description)
GET /submission/all — Bearer token (ADMIN sees all, PARTICIPANT sees own)
GET /submission/:id — Bearer token
PATCH /submission/:id/status — ADMIN token, body: { status: "ACCEPTED" | "REJECTED" | "UNDER_REVIEW" }
Suggested test order:

POST /auth/sign-up → grab the token
GET /user/me → verify token works
GET /hackathon → verify public access
POST /hackathon/create → needs ADMIN — you'll need to manually set role in DB or seed one
POST /hackathon/:id/join
POST /submission/:hackathonId/submit
PATCH /submission/:id/status (ADMIN)
