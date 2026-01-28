'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BatchList } from '@/app/components/BatchList';
import { UserTokenHistory } from '@/app/components/UserTokenHistory';
import { AnalyticsSummary } from '@/app/components/AnalyticsSummary';
import { BounceAnalysis, Batch } from '@/app/components/BounceAnalysis';
import { ScheduledBatchesList } from '@/app/components/ScheduledBatchesList';

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/me');

        if (!res.ok) {
          throw new Error('Authentication required');
        }

        const data = await res.json();
        if (!data) {
          router.push('/login');
          return;
        }

        setUser(data);

        // Fetch batches
        const batchesRes = await fetch('/api/batches');
        if (!batchesRes.ok) {
          throw new Error('Failed to fetch batches');
        }
        const batchesData = await batchesRes.json();
        // Extract the batches array from the response
        setBatches(batchesData.batches || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to authenticate');
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-red-600">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <AnalyticsSummary />

        <div className='my-10'>
          <BounceAnalysis batches={batches} />
        </div>
        <div className='my-10'>
          <ScheduledBatchesList />
        </div>
        <div className='my-10'>
          <BatchList />
        </div>
        <div className='my-10'>
          <UserTokenHistory />
        </div>
      </div>
    </main>
  );
}
