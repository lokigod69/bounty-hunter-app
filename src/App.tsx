// src/App.tsx
// Main application component, sets up routing.
// Corrected routing for ProfileEdit. Added routes for DailyContractsPage.
// Renamed MarketplacePage to BountyStorePage and updated its route.
// Added route for MyCollectedBountiesPage.

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Friends from './pages/Friends';
import ProfileEdit from './pages/ProfileEdit'; // Import ProfileEdit page
import DailyContractsPage from './pages/DailyContractsPage'; // Phase 8: Import DailyContractsPage
import BountyStorePage from './pages/BountyStorePage'; // Renamed from MarketplacePage
import MyCollectedBountiesPage from './pages/MyCollectedBountiesPage'; // Import MyCollectedBountiesPage
import { useAuth } from './hooks/useAuth';

// Protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-6 text-center">
          <div className="w-12 h-12 border-2 border-t-teal-500 border-white/10 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            {/* Routes below are protected and use the Layout component */}
            <Route index element={<Dashboard />} />
            <Route path="friends" element={<Friends />} />
            <Route path="profile/edit" element={<ProfileEdit />} />
            <Route path="daily-contracts" element={<DailyContractsPage />} /> {/* Phase 8: Route for Daily Contracts */}
            <Route path="bounty-store" element={<BountyStorePage />} /> {/* Renamed from marketplace */}
            <Route path="my-bounties" element={<MyCollectedBountiesPage />} />
            {/* Add other protected routes here */}
          </Route>
          {/* Fallback for any other route, could be a 404 page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionContextProvider>
  );
}