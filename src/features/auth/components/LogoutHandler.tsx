import { useEffect } from 'react';
import { useAuth } from '@/app/AuthProvider';
import { Loader2 } from 'lucide-react';

/**
 * This component doesn't render anything visible.
 * It just triggers the sign-out process when mounted.
 * The redirection happens automatically when AuthProvider updates the state.
 */
export function LogoutHandler() {
  const { signOut, loading } = useAuth();

  useEffect(() => {
    console.log('[LogoutHandler] Mounting, calling signOut...');
    signOut();
  }, [signOut]); // Dependency array ensures signOut is called only once on mount

  // Optionally, show a loading indicator while signing out
  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Logging out...</span>
        </div>
    );
  }

  return null; // Render nothing once sign out is initiated or completed
} 