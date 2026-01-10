'use client';

import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.ok) {
      setMessage(
        'If that email is in our database, you will receive a reset link.'
      );
    } else {
      setMessage('Failed to process password reset.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl text-black font-bold mb-6 text-center">Forgot Password</h2>
        {message ? (
          <p className="text-center text-gray-700">{message}</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border text-gray-700 border-gray-300 rounded mt-1"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
            >
              Send Reset Link
            </button>
          </form>
        )}
        <p className="mt-4 text-center">
          <a href="/login" className="text-blue-500 hover:underline">
            Back to Login
          </a>
        </p>
      </div>
    </div>
  );
}
