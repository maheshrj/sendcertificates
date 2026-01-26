'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '../../components/Navbar';
import { TokenManagement } from '../../components/TokenManagement';
import { TokenTransactionHistory } from '@/app/components/TokenTransactionHistory';
import UserManagement from '@/app/components/UserManagement';

export default function Dashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/me');
        const data = await response.json();

        if (!data.user?.is_admin) {
          router.push('/');
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/login');
      }
    };

    checkAdmin();
  }, [router]);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
    </div>;
  }

  return (

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col space-y-6">
        {/* User Management Section */}
        <div>
          <UserManagement />
        </div>
        {/* Token Management Section */}
        <div>
          <TokenManagement />
        </div>
        {/* Transaction History Section */}
        <div>
          <TokenTransactionHistory />
        </div>
      </div>
    </div>
  );
}