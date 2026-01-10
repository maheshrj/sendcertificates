'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EmailConfigForm from '@/app/components/EmailConfigForm';
import DomainConfigForm from '@/app/components/DomainConfigForm';


export default function EmailConfigPage() {
 const router = useRouter();
 const [user, setUser] = useState<any>(null);
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
   return null; // Router will handle redirect
 }
  return (
   <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
     <div className="px-4 py-6 sm:px-0">
       <h1 className="text-2xl font-semibold text-gray-900 mb-6">Email Settings</h1>
       <EmailConfigForm />
       <DomainConfigForm />
     </div>
   </main>
 );
}