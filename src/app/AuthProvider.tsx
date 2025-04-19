import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from 'react';
import { supabase } from '@/config/supabaseClient';
import type {
  AuthContextType,
  DbUserProfile,
  DbRole,
  PermissionsMap,
  SupabaseSession,
  SupabaseUser,
  UserAuthDetails,
} from '@/types/auth';

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  role: null,
  permissions: {},
  loading: true, // Start loading initially
  signOut: async () => {
    console.error('SignOut function called before AuthProvider initialized.');
  },
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [profile, setProfile] = useState<DbUserProfile | null>(null);
  const [role, setRole] = useState<DbRole | null>(null);
  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [loading, setLoading] = useState(true); // Tracks loading of session AND profile/permissions

  const fetchUserDetails = useCallback(async (userId: string | undefined) => {
    if (!userId) {
        console.error("No user ID provided to fetchUserDetails");
        setProfile(null);
        setRole(null);
        setPermissions({});
        setLoading(false);
        return;
    }

    setLoading(true);
    console.log(`[AuthProvider] Fetching details for user: ${userId}`); // Log start
    try {
      // Call the Supabase function
      const { data, error } = await supabase.rpc('get_user_auth_details', {
        p_user_id: userId,
      });

      if (error) {
        console.error('[AuthProvider] Error fetching user details RPC:', error); // Log RPC error
        throw error;
      }

      if (data && data.error) {
          console.error('[AuthProvider] Error returned from RPC function:', data.error); // Log function error
          throw new Error(data.error);
      }

      const details = data as UserAuthDetails | null; // Type assertion

      console.log('[AuthProvider] Fetched user details:', details); // Log fetched data

      if (details) {
        setProfile(details.profile);
        setRole(details.role);
        setPermissions(details.permissions || {}); // Ensure permissions is always an object
      } else {
        // Handle case where RPC returns null or unexpected data
        setProfile(null);
        setRole(null);
        setPermissions({});
        console.warn('No user details returned from RPC for user:', userId);
      }
    } catch (error) {
      console.error('[AuthProvider] Caught exception fetching user details:', error); // Log catch block
      // Reset state on error
      setProfile(null);
      setRole(null);
      setPermissions({});
    } finally {
      console.log("[AuthProvider] Setting loading to false in fetchUserDetails"); // Log finally block
      setLoading(false);
    }
  }, []);

  // Effect to handle auth state changes
  useEffect(() => {
    // Start loading on initial check
    setLoading(true);

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        fetchUserDetails(currentUser.id); // Fetch details if session exists initially
      } else {
        setLoading(false); // No user, stop loading
      }
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthProvider] Auth event: ${event}`, session); // Log event
        setSession(session);
        const currentUser = session?.user ?? null;
        // Log before setting user state
        console.log('[AuthProvider] Setting user state to:', currentUser);
        setUser(currentUser);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (currentUser) {
              console.log('[AuthProvider] User found after SIGNED_IN, calling fetchUserDetails...'); // Log before fetch
              fetchUserDetails(currentUser.id); // Fetch details on sign in or token refresh
          } else {
              // Edge case: Event received but no user in session? Clear state.
              console.log('[AuthProvider] SIGNED_IN event but no user, setting loading false.'); // Log edge case
              setProfile(null);
              setRole(null);
              setPermissions({});
              setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          // Clear user-specific data on sign out
          console.log('[AuthProvider] SIGNED_OUT event, clearing state and setting loading false.'); // Log sign out
          setProfile(null);
          setRole(null);
          setPermissions({});
          setLoading(false); // Stop loading on sign out
        } else {
           // For other events like INITIAL_SESSION, PASSWORD_RECOVERY etc.,
           // we might not need to refetch details unless the user object changes significantly.
           // If there's a user, ensure details are loaded or loading is false.
           if (!currentUser) {
             console.log('[AuthProvider] Other event and no user, setting loading false.'); // Log other cases
             setLoading(false);
           }
        }
      }
    );

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [fetchUserDetails]); // Include fetchUserDetails in dependency array

  // Sign out function
  const signOut = async () => {
    setLoading(true); // Optional: show loading state during sign out
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      setLoading(false); // Reset loading on error
    }
    // State updates (clearing user, profile etc.) are handled by the onAuthStateChange listener
  };

  const value = {
    session,
    user,
    profile,
    role,
    permissions,
    loading,
    signOut,
  };

  // Log the value being provided just before returning the provider
  console.log('[AuthProvider Rendering] Providing context value:', { 
    loading: value.loading, 
    user: !!value.user 
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the Auth Context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  // Removed the log from here to avoid noise, focus on Provider and Consumer logs
  // console.log('[useAuth Hook] Called. Returning context:', { 
  //   loading: context?.loading, 
  //   user: !!context?.user 
  // }); 
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 