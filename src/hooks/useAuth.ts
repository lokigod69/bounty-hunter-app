// src/hooks/useAuth.ts
// R7 FIX: Re-export from AuthContext for backwards compatibility
// The actual implementation is now in src/context/AuthContext.tsx
// This ensures all components share the same profile state via React Context

export { useAuth } from '../context/AuthContext';
