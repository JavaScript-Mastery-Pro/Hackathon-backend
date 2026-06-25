declare global {
  namespace Express {
    // Subset of Better Auth's user that our app reads. The guard from
    // @thallesp/nestjs-better-auth attaches `req.user = session.user`.
    interface User {
      id: string;
      email: string;
      role: string;
    }

    interface Request {
      user?: User;
      session?: unknown;
    }
  }
}

export {};
