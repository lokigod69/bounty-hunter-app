// src/pages/Login.tsx
// Redesigned to center the login form, add the application logo and title, and use the custom Mandalore font.

import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

const Login: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithOtp({ email: normalizedEmail });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Check your email for the magic link!');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <img src="/logo5.png" alt="Bounty Hunter" className="w-24 h-24 mb-4" />
      
      <h1 className="font-mandalore text-5xl font-bold tracking-wider mb-8 text-teal-400">
        BOUNTY HUNTER
      </h1>
      
      <div className="w-full max-w-sm p-8 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center text-slate-300 mb-6">Sign In</h2>
        <p className="text-center text-slate-400 mb-6">Enter your email to receive a magic link.</p>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-600 rounded-md text-white font-bold transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;