<h1 align="center">🚀 Hackathon Backend</h1>

<p align="center">
  A scalable backend API for hackathon management, built with NestJS. Features user authentication, hackathon CRUD, project submissions, and asynchronous processing.
</p>

## Table of Contents

- 📖 [Introduction](#introduction)
- 🛠️ [Tech Stack](#tech-stack)
- ✨ [Features](#features)
- 🚀 [Quick Start](#quick-start)
- 🔧 [Environment Variables](#environment-variables)

<h2 id="introduction">📖 Introduction</h2>

Hackathon Backend is a scalable API built with NestJS for managing hackathons. It offers user authentication, hackathon CRUD operations, project submissions with file uploads, asynchronous processing, and email notifications, all secured with modern technologies.

<h2 id="tech-stack">🛠️ Tech Stack</h2>

- **[NestJS](https://nestjs.com/)** - A progressive Node.js framework for building efficient, reliable and scalable server-side applications.
- **[Prisma](https://www.prisma.io/)** - Next-generation ORM for TypeScript & Node.js.
- **[PostgreSQL](https://www.postgresql.org/)** - Advanced open source relational database.
- **[Better Auth](https://www.better-auth.com/)** - Complete open-source authentication solution.
- **[BullMQ](https://docs.bullmq.io/)** - Premium message queue for Node.js based on Redis.
- **[Arcjet](https://arcjet.com/)** - Security layer for your applications.
- **[Nodemailer](https://nodemailer.com/)** - Send emails from Node.js.

<h2 id="features">✨ Features</h2>

- 🔐 **Authentication** (`/api/auth`): User registration, login, and role-based access control
- 🏆 **Hackathon Management** (`/hackathon`): CRUD operations for hackathons and participant registration
- 📁 **Project Submissions** (`/submission`): File upload support with asynchronous processing via BullMQ
- 📧 **Email Notifications**: Automated emails for hackathon events and submissions
- 🛡️ **Security**: Arcjet integration for threat protection and rate limiting

<h2 id="quick-start">🚀 Quick Start</h2>

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database
- Redis instance

### Installation

1. 📥 Clone the repository:

   ```bash
   git clone https://github.com/JavaScript-Mastery-Pro/Hackathon-backend.git
   cd hackathon-backend
   ```

2. 📦 Install dependencies:

   ```bash
   npm install
   ```

3. 🗄️ Set up the database:

   ```bash
   npm run db:migrate
   ```

4. 🔧 Generate Prisma client:

   ```bash
   npm run db:generate
   ```

5. ▶️ Start the development server:
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:8080`.

<h2 id="environment-variables">🔧 Environment Variables</h2>

Create a `.env` file in the root directory and configure the following variables:

```env
PORT=8080
BACKEND_URL="http://localhost:8080"
FRONTEND_URL="http://localhost:3000"
AUTH_SECRET="your-auth-secret-here"
DATABASE_URL="your-postgresql-database-url"
REDIS_URL="your-redis-url"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USERNAME="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
ARCJET_ENV=development
ARCJET_KEY=your-arcjet-key
```

### Notes

- `AUTH_SECRET`: Generate a secure random string for authentication.
- `DATABASE_URL`: Use your PostgreSQL connection string.
- `REDIS_URL`: Connection string for your Redis instance.
- `SMTP_*`: Configure your email service (e.g., Gmail SMTP).
- `ARCJET_*`: Obtain keys from Arcjet dashboard.
