'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { WelcomeScreen } from '@/components/welcome-screen';
import { Skeleton } from '@/components/ui/skeleton';
import { AppShell } from '@/components/layout/app-shell';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function HomePage() {
  const { data: session, status } = useSession();

  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      const token = (session?.user as any)?.accessToken;
      console.log('Session user:', session?.user);
      if (!token || token === 'undefined' || token === 'null') {
        import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/auth/login' }));
      }
    }
  }, [status, router, session]);

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <AppShell>
      <WelcomeScreen />
    </AppShell>
  );
}
