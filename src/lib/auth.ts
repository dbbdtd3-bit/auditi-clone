import NextAuth from 'next-auth';
import { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './db';
import bcrypt from 'bcryptjs';
import { recordAudit } from './audit';

class PendingAccountError extends CredentialsSignin {
  code = 'pending_account';
}

class DisabledAccountError extends CredentialsSignin {
  code = 'disabled_account';
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-Mail', type: 'email' },
        password: { label: 'Passwort', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });
        } catch {
          return null;
        }

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!valid) return null;

        if (user.status === 'DISABLED') {
          throw new DisabledAccountError();
        }
        if (user.status === 'PENDING') {
          throw new PendingAccountError();
        }

        void recordAudit({ actorId: user.id, actorEmail: user.email, action: 'USER_LOGIN' });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: unknown }).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
