import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { authConfig } from '@/auth.config';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
    Credentials({
      id: 'impersonate',
      credentials: { token: { type: 'text' } },
      async authorize(credentials) {
        if (!credentials?.token) return null;
        const record = await prisma.impersonationToken.findUnique({
          where: { token: credentials.token as string },
          include: { user: true },
        });
        if (!record || record.usedAt || record.expiresAt < new Date()) return null;
        await prisma.impersonationToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        });
        return { id: record.user.id, email: record.user.email, name: record.user.name, role: record.user.role };
      },
    }),
  ],
});
