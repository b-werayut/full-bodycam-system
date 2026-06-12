import { type ReactNode } from 'react';
import { AuthProvider } from '../contexts/AuthContext';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => (
  <AuthProvider>
    {children}
  </AuthProvider>
);
