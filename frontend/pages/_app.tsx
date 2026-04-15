import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';

import { createQueryClient } from '../lib/query-client';
import { setUnauthorizedHandler } from '../services/api';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void router.push('/login');
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '18px',
            background: '#0f172a',
            color: '#f8fafc'
          }
        }}
      />
    </QueryClientProvider>
  );
}

