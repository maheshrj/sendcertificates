// app/providers.tsx

'use client';

// Remove the import and usage of SessionProvider
// import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
