import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

export function applySessionClaims(session: Session, token: JWT): Session {
  if (session.user && token.sub) {
    session.user.id = token.sub;
  }

  if (session.user) {
    session.user.subscriptionStatus = token.subscriptionStatus;
  }

  return session;
}
