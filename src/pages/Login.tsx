// src/pages/Login.tsx
// Login page with magic link authentication
// Added client-side email normalization (trim and toLowerCase) in handleLogin.
// Fixed redirect path in Navigate component from "/\" to "/".

import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Bell, Mail, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Redirect to dashboard if already logged in
  if (user && !authLoading) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    // Normalize email: trim whitespace and convert to lowercase
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail, // Use normalized email
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Check your email for the login link!' });
    }
    setEmail('');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-950 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="glass-card p-8 w-full max-w-md text-center relative z-10">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-3 rounded-xl mb-3">
            <Bell size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Task Bounties</h1>
          <p className="text-white/70 mt-2">
            Assign tasks, collect rewards, celebrate wins
          </p>
        </div>

        <div className="mb-8">
          <p className="text-white/90 mb-4">
            Enter your email to receive a magic link for secure, password-free access.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail size={16} className="text-white/50" />
            </div>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field w-full pl-10"
              required
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader size={16} className="animate-spin mr-2" />
                Sending Link...
              </>
            ) : (
              'Send Magic Link'
            )}
          </button>

          {message && (
            <div className={`p-3 rounded-lg ${
              message.type === 'error' 
                ? 'bg-red-500/20 text-red-400' 
                : 'bg-green-500/20 text-green-400'
            }`}>
              {message.text}
            </div>
          )}
        </form>

        <div className="mt-8 text-sm">
          <p className="text-white/50">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}