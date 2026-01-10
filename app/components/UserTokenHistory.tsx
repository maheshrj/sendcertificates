'use client';

import {useState, useEffect } from 'react';
import { format } from 'date-fns';

interface TokenTransaction {
 id: string;
 amount: number;
 type: string;
 reason: string;
 email: string;
 createdAt: string;
}

interface PaginationData {
    total: number;
    pageSize: number;
    currentPage: number;
    totalPages: number;
}

export function UserTokenHistory() {
 const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [currentPage, setCurrentPage] = useState(1);
 const [pagination, setPagination] = useState<PaginationData | null>(null);
  useEffect(() => {
   fetchTransactions(currentPage);
 }, [currentPage]);
  const fetchTransactions = async (page: number) => {
   try {
     setIsLoading(true);
     const response = await fetch(`/api/user-transactions?page=${page}`);
     if (!response.ok) {
       throw new Error('Failed to fetch transactions');
     }
     const data = await response.json();
     setTransactions(data.transactions);
     setPagination(data.pagination);
   } catch (error) {
     setError('Failed to load transaction history');
     console.error('Error fetching transactions:', error);
   } finally {
     setIsLoading(false);
   }
 };

 const PaginationControls = () => {
    if (!pagination) return null;
    
    return (
      <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
            disabled={currentPage === pagination.totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing page <span className="font-medium">{currentPage}</span> of{' '}
              <span className="font-medium">{pagination.totalPages}</span>
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                disabled={currentPage === pagination.totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
   return (
     <div className="bg-white shadow rounded-lg p-6">
       <div className="animate-pulse">
         <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
         <div className="space-y-3">
           {[1, 2, 3].map((i) => (
             <div key={i} className="h-4 bg-gray-200 rounded"></div>
           ))}
         </div>
       </div>
     </div>
   );
 }
  if (error) {
   return (
     <div className="bg-white shadow rounded-lg p-6">
       <div className="text-red-600">{error}</div>
     </div>
   );
 }
  return (
   <div className="bg-white shadow rounded-lg p-6">
     <div className="flex justify-between items-center mb-6">
       <h2 className="text-xl font-semibold">Your Token History</h2>
     </div>
     
     {transactions.length === 0 ? (
       <div className="text-center py-8 text-gray-500">
         No transactions found
       </div>
     ) : (
       <div className="overflow-x-auto">
         <table className="min-w-full divide-y divide-gray-200">
           <thead className="bg-gray-50">
             <tr>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Date
               </th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Type
               </th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Amount
               </th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                 Reason
               </th>
             </tr>
           </thead>
           <tbody className="bg-white divide-y divide-gray-200">
             {transactions.map((transaction) => (
               <tr key={transaction.id}>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                   {format(new Date(transaction.createdAt), 'MMM d, yyyy HH:mm')}
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap">
                   <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                     transaction.type === 'ADD' 
                       ? 'bg-green-100 text-green-800' 
                       : 'bg-red-100 text-red-800'
                   }`}>
                     {transaction.type}
                   </span>
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                   {transaction.type === 'ADD' ? '+' : '-'}{transaction.amount}
                 </td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                   {transaction.reason}
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
     )}
    {transactions.length > 0 && <PaginationControls />}
   </div>
 );
}