import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

const prisma = new PrismaClient();

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                console.log("🔍 [Auth] Attempting login for:", credentials?.email);

                if (!credentials?.email || !credentials?.password) {
                    console.log("❌ [Auth] Missing credentials");
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                });

                if (!user) {
                    console.log("❌ [Auth] User not found in DB");
                    return null;
                }

                if (!user.password) {
                    console.log("❌ [Auth] User has no password");
                    return null;
                }

                console.log("✅ [Auth] User found:", user.id);
                console.log("🔑 [Auth] Stored Hash:", user.password);

                const isPasswordCorrect = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                console.log("🔐 [Auth] Password match result:", isPasswordCorrect);

                if (!isPasswordCorrect) return null;

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    storeId: user.storeId,
                    role: user.role,
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        ...authConfig.callbacks,
        // Override session callback to include strict DB check (runs on Server only)
        async session({ session, token }) {
            if (token && session.user) {
                // Validación estricta: Verificar si el usuario aún existe en DB
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { id: true, storeId: true, role: true }
                });

                if (!dbUser) {
                    return null as any;
                }

                (session.user as any).id = token.id as string;
                (session.user as any).storeId = dbUser.storeId;
                (session.user as any).role = dbUser.role;
            }
            return session;
        },
    },
});
