import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith("/");
            const isOnLogin = nextUrl.pathname.startsWith("/login");

            if (isOnDashboard) {
                if (isOnLogin) return true; // Always allow access to login page
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            } else if (isLoggedIn) {
                return Response.redirect(new URL("/", nextUrl));
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.storeId = (user as any).storeId;
            }
            return token;
        },
        async session({ session, token }) {
            // Note: DB check cannot happen here in Edge Runtime (Middleware)
            // It will happen in the full auth() call in Server Components
            if (token && session.user) {
                (session.user as any).id = token.id as string;
                (session.user as any).storeId = token.storeId as string;
            }
            return session;
        },
    },
    providers: [], // Providers added in auth.ts
} satisfies NextAuthConfig;
