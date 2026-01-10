'use client';

import {useState } from 'react';

interface TokenFormData {
 email: string;
 amount: string;
}

export function TokenManagement() {
 const [formData, setFormData] = useState<TokenFormData>({
   email: '',
   amount: ''
 });
 const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
 const [isSubmitting, setIsSubmitting] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
   e.preventDefault();
   setIsSubmitting(true);
   setMessage(null);
    try {
     const response = await fetch('/api/tokens', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
        email: formData.email,
        amount: parseInt(formData.amount, 10) 
      }),
     });
      const data = await response.json();
      if (!response.ok) {
       throw new Error(data.error || 'Failed to add tokens');
     }
      setMessage({
       type: 'success',
       text: `Successfully added ${formData.amount} tokens to ${formData.email}. New balance: ${data.tokens} tokens`
     });
     
     // Reset form
     setFormData({ email: '', amount: '' });
   } catch (error: any) {
     setMessage({
       type: 'error',
       text: error.message || 'Failed to add tokens'
     });
   } finally {
     setIsSubmitting(false);
   }
 };
  return (
   <div className="bg-white shadow rounded-lg p-6">
     <h2 className="text-xl font-semibold mb-4">Add Tokens to User</h2>
     
     {message && (
       <div className={`p-4 mb-4 rounded ${
         message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
       }`}>
         {message.text}
       </div>
     )}
      <form onSubmit={handleSubmit} className="space-y-4">
       <div>
         <label htmlFor="email" className="block text-sm font-medium text-gray-700">
           User Email
         </label>
         <input
           type="email"
           id="email"
           value={formData.email}
           onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
           className="w-full p-2 border border-gray-300 rounded focus:outline-1 focus:outline-blue-500"
           placeholder="user@example.com"
           required
         />
       </div>
        <div>
         <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
           Number of Tokens
         </label>
         <input
           type="number"
           id="amount"
           value={formData.amount}
           onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
           className="w-full p-2 border border-gray-300 rounded focus:outline-1 focus:outline-blue-500"
           min="1"
           required
         />
       </div>
        <button
         type="submit"
         disabled={isSubmitting}
         className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
           ${isSubmitting 
             ? 'bg-blue-400 cursor-not-allowed' 
             : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
           }`}
       >
         {isSubmitting ? 'Adding Tokens...' : 'Add Tokens'}
       </button>
     </form>
   </div>
 );
}