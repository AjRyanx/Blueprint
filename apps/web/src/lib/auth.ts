// @ts-nocheck
import NextAuth, { type NextAuthResult } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';

// Force IPv4 for internal server-to-server fetches to avoid Node 18+ IPv6 resolution bugs
const API = process.env.NEXT_PUBLIC_API_URL?.replace('localhost', '127.0.0.1');

// @ts-ignore - NextAuth v5 type inference quirk
const nextAuth = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const res = await fetch(`${API}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          });
          const json = await res.json();
          if (!json.success) return null;
          return {
            id: json.data.user.id,
            email: json.data.user.email,
            name: json.data.user.name,
            accessToken: json.data.accessToken,
          };
        } catch {
          return null;
        }
      },
    }),
    Google({ clientId: process.env.AUTH_GOOGLE_ID!, clientSecret: process.env.AUTH_GOOGLE_SECRET! }),
    GitHub({ clientId: process.env.AUTH_GITHUB_ID!, clientSecret: process.env.AUTH_GITHUB_SECRET! }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account && (account.provider === 'google' || account.provider === 'github')) {
        try {
          const res = await fetch(`${API}/api/v1/auth/oauth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: profile?.email ?? '',
              name: profile?.name ?? user?.name ?? '',
              avatarUrl: (profile as any)?.picture ?? (profile as any)?.avatar_url ?? undefined,
              provider: account.provider,
            }),
          });
          const json = await res.json();
          if (json.success) {
            token.id = json.data.user.id;
            token.accessToken = json.data.accessToken;
          }
        } catch (err) {
          console.error('OAuth sync failed:', err);
          // OAuth sync failed, session will proceed without API access
        }
      } else if (user) {
        token.id = user.id;
        token.accessToken = (user as any).accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: { signIn: '/auth/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
});

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;
export const auth: any = nextAuth.auth;
