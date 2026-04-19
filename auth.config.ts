import type { NextAuthConfig } from 'next-auth';

// Lightweight config used in the proxy (edge runtime) — no DB imports
export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  pages: { signIn: '/login' },
};
