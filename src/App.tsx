// src/App.tsx
// Main application component, sets up routing.
// Corrected routing for ProfileEdit.
// Renamed BountyStorePage to RewardsStorePage and MyCollectedBountiesPage to MyCollectedRewardsPage, and updated routes.
// Removed DailyContractsPage route and import.
// Added IssuedPage route for viewing contracts created by the user.
// P1: Added ThemeProvider wrapper for theme system support.
// P2: Added onboarding route and FTXGate component to check if new users should see onboarding flow.

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import Onboarding from './pages/Onboarding'; // P2: First-Time Experience onboarding flow
import FTXGate from './components/FTXGate'; // P2: First-Time Experience gate
import { useAuth } from './hooks/useAuth';
import { Toaster } from 'react-hot-toast';
import { UIProvider } from './context/UIContext';
import { ThemeProvider } from './context/ThemeContext';

// Protected route component - handles authentication only
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // ALL HOOKS AT TOP LEVEL
  const { user, session, profileLoading } = useAuth();
  const location = useLocation();
  
  // NO HOOKS BELOW THIS LINE - only conditional returns
  
  // Wait for profile to load
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-6 text-center">
          <div className="w-12 h-12 border-2 border-t-teal-500 border-white/10 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  // Not authenticated - redirect to login
  if (!user || !session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Authenticated and profile loaded - render children
  return <>{children}</>;
}

export default function App() {
  return (
    <SessionContextProvider supabaseClient={supabase}>
      <ThemeProvider>
        <UIProvider>
          <Toaster toastOptions={{ style: { background: '#333', color: '#fff' } }} />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<Login />} />
              
              {/* Onboarding route - requires auth, but NOT blocked by FTXGate */}
              <Route path="/onboarding" element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              } />
              
              {/* Main app routes - wrapped by ProtectedRoute + FTXGate */}
              <Route path="/" element={
                <ProtectedRoute>
                  <FTXGate>
                    <Layout />
                  </FTXGate>
                </ProtectedRoute>
              }>
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
        </UIProvider>
      </ThemeProvider>
    </SessionContextProvider>
  );
}