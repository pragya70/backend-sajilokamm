import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
        (session.user as any).role = (token as any).role ?? "POSTER";
        (session.user as any).selectedCategories = (token as any).selectedCategories ?? [];
        (session.user as any).verificationStatus = (token as any).verificationStatus ?? "UNVERIFIED";
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        (token as any).role = (user as any).role;
        (token as any).selectedCategories = (user as any).selectedCategories;
        (token as any).verificationStatus = (user as any).verificationStatus;
        // Never store image in JWT — it can be too large and break the cookie
      }
      if (trigger === "update" && session?.verificationStatus) {
        (token as any).verificationStatus = session.verificationStatus;
      }
      return token;
    },
  },
  session: { strategy: "jwt" },
} satisfies NextAuthConfig;
