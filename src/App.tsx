// src/App.tsx
// Main application component, sets up routing.
// Corrected routing for ProfileEdit.
// Renamed BountyStorePage to RewardsStorePage and MyCollectedBountiesPage to MyCollectedRewardsPage, and updated routes.
// Removed DailyContractsPage route and import.
// Added IssuedPage route for viewing contracts created by the user.

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Friends from './pages/Friends';
import ArchivePage from './pages/ArchivePage';
import ProfileEdit from './pages/ProfileEdit'; // Import ProfileEdit page
import RewardsStorePage from './pages/RewardsStorePage'; // Renamed from BountyStorePage
import MyCollectedRewardsPage from './pages/MyCollectedRewardsPage'; // Renamed from MyCollectedBountiesPage
import IssuedPage from './pages/IssuedPage'; // Import for Issued Contracts page
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
            <Route path="archive" element={<ArchivePage />} />
            <Route path="profile/edit" element={<ProfileEdit />} />
            <Route path="rewards-store" element={<RewardsStorePage />} /> {/* Renamed from bounty-store */}
            <Route path="my-rewards" element={<MyCollectedRewardsPage />} /> {/* Renamed from my-bounties */}
            <Route path="issued" element={<IssuedPage />} /> {/* Route for Issued Contracts */}
            {/* Add other protected routes here */}
          </Route>
          {/* Fallback for any other route, could be a 404 page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionContextProvider>
  );
}