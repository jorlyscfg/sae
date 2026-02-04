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
                if (!credentials?.email || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                });

                if (!user || !user.password) return null;

                const isPasswordCorrect = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!isPasswordCorrect) return null;

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    storeId: user.storeId,
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
                    select: { id: true, storeId: true }
                });

                if (!dbUser) {
                    return null as any;
                }

                (session.user as any).id = token.id as string;
                (session.user as any).storeId = dbUser.storeId;
            }
            return session;
        },
    },
});
