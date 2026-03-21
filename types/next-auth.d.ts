import { SubscriptionStatus } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    id: string;
    subscriptionStatus: SubscriptionStatus;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      subscriptionStatus?: SubscriptionStatus;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    subscriptionStatus?: SubscriptionStatus;
  }
}
