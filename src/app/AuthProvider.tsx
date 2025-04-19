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
  AuthStage,
} from '@/types/auth';

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  role: null,
  permissions: {},
  loading: true,
  authStage: 'loading',
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
  const [loading, setLoading] = useState(true);
  const [authStage, setAuthStage] = useState<AuthStage>('loading');
  // Flag to indicate if the initial recovery check has determined the state
  const [initialStateDetermined, setInitialStateDetermined] = useState(false);

  // --- User Details Fetching --- 
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
    console.log(`[AuthProvider] Fetching details for user: ${userId}`);
    try {
      const { data, error } = await supabase.rpc('get_user_auth_details', {
        p_user_id: userId,
      });

      if (error) {
        console.error('[AuthProvider] Error fetching user details RPC:', error);
        throw error;
      }

      if (data && data.error) {
          console.error('[AuthProvider] Error returned from RPC function:', data.error);
          throw new Error(data.error);
      }

      const details = data as UserAuthDetails | null;

      console.log('[AuthProvider] Fetched user details:', details);

      if (details) {
        setProfile(details.profile);
        setRole(details.role);
        setPermissions(details.permissions || {});
      } else {
        setProfile(null);
        setRole(null);
        setPermissions({});
        console.warn('No user details returned from RPC for user:', userId);
      }
    } catch (error) {
      console.error('[AuthProvider] Caught exception fetching user details:', error);
      setProfile(null);
      setRole(null);
      setPermissions({});
    } finally {
      console.log("[AuthProvider] Setting loading to false in fetchUserDetails");
      setLoading(false);
    }
  }, []);

  // --- Initial State Determination (Mount Effect) ---
  useEffect(() => {
    console.log('[AuthProvider Mount] Checking initial state...');
    let recoveryDetected = false;
    
    // Check for recovery in hash or tokens in URL that indicate an invite link
    const url = window.location.href;
    if (window.location.hash.includes('type=recovery') || 
        url.includes('access_token=') && url.includes('refresh_token=')) {
      console.log('[AuthProvider Mount] Detected recovery or invite link in URL.');
      recoveryDetected = true;
    }

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
        console.log('[AuthProvider Mount] Initial session result:', { initialSession, recoveryDetected });
        const currentUser = initialSession?.user ?? null;
        setSession(initialSession); // Set session regardless
        setUser(currentUser);      // Set user regardless

        if (recoveryDetected && currentUser) {
            console.log('[AuthProvider Mount] Applying Recovery flow -> needs_password_set');
            setAuthStage('needs_password_set');
            setLoading(false);
        } else if (currentUser) {
            console.log('[AuthProvider Mount] User exists, fetching details...');
            setLoading(true);
            fetchUserDetails(currentUser.id).then(() => {
                setAuthStage('authenticated');
                 setLoading(false); // Set loading false *after* details are fetched
                console.log('[AuthProvider Mount] Details fetched -> authenticated');
            }).catch(() => {
                console.error('[AuthProvider Mount] Error fetching details, setting unauthenticated.');
                setAuthStage('unauthenticated');
                setLoading(false);
            });
        } else {
            console.log('[AuthProvider Mount] No user -> unauthenticated');
            setAuthStage('unauthenticated');
            setLoading(false);
        }
        setInitialStateDetermined(true); // Mark initial check complete
    }).catch(error => {
         console.error('[AuthProvider Mount] Error getting initial session:', error);
         setAuthStage('unauthenticated'); // Default to unauth on error
         setLoading(false);
         setInitialStateDetermined(true);
    });

  }, [fetchUserDetails]); // Depend on fetchUserDetails

  // --- Auth State Change Listener ---
  useEffect(() => {
    // Only set up the listener *after* the initial state is determined
    if (!initialStateDetermined) {
        console.log('[AuthProvider Listener Effect] Waiting for initial state determination...');
        return; 
    }
    console.log('[AuthProvider Listener Effect] Setting up onAuthStateChange listener.');

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log(`[AuthProvider Event: ${event}] Session:`, currentSession);
        const currentUser = currentSession?.user ?? null;

        // Update session and user state immediately
        setSession(currentSession);
        setUser(currentUser);

        switch (event) {
            case 'INITIAL_SESSION':
                // This case might be redundant now due to the mount effect,
                // but we can keep it as a fallback or for subsequent loads.
                console.log('[AuthProvider Event] INITIAL_SESSION received (might be redundant).');
                // Re-check based on current state if needed, but mount effect should handle first load.
                if (authStage === 'loading') { // Only if stage wasn't set by mount
                     if (currentUser) {
                        setLoading(true);
                        fetchUserDetails(currentUser.id).then(() => {
                            setAuthStage('authenticated');
                            setLoading(false);
                        }).catch(() => { setAuthStage('unauthenticated'); setLoading(false); });
                    } else {
                        setAuthStage('unauthenticated');
                        setLoading(false);
                    }
                }
                break;
            case 'SIGNED_IN':
                 // If already authenticated or needing password set, ignore redundant SIGNED_IN
                 if (authStage === 'authenticated' || authStage === 'needs_password_set') {
                    console.log('[AuthProvider Event] SIGNED_IN ignored (already handled or in recovery).');
                    break;
                 } 
                 // Otherwise, treat as a normal login
                 if (currentUser) {
                    console.log('[AuthProvider Event] SIGNED_IN (Normal) -> fetching details...');
                    setLoading(true);
                    fetchUserDetails(currentUser.id).then(() => {
                        setAuthStage('authenticated');
                        setLoading(false);
                    }).catch(() => { setAuthStage('unauthenticated'); setLoading(false); });
                 } else {
                    console.log('[AuthProvider Event] SIGNED_IN No User -> unauthenticated');
                    setAuthStage('unauthenticated');
                    setLoading(false);
                 }
                 break;
             case 'SIGNED_OUT':
                 console.log('[AuthProvider Event] SIGNED_OUT -> unauthenticated');
                 setProfile(null);
                 setRole(null);
                 setPermissions({});
                 setAuthStage('unauthenticated');
                 setLoading(false);
                 break;
            case 'PASSWORD_RECOVERY':
                 console.log('[AuthProvider Event] PASSWORD_RECOVERY -> needs_password_set');
                 // This event explicitly means the user needs to set a password
                 setAuthStage('needs_password_set');
                 setLoading(false);
                 break;
            case 'USER_UPDATED':
                 console.log('[AuthProvider Event] USER_UPDATED');
                 if (currentUser) {
                    // If they were setting password, transition to authenticated after fetching details
                     if (authStage === 'needs_password_set') {
                         console.log('[AuthProvider Event] USER_UPDATED from needs_password_set -> fetching details...');
                         setLoading(true);
                         fetchUserDetails(currentUser.id).then(() => {
                            setAuthStage('authenticated');
                            setLoading(false);
                         }).catch(() => { setAuthStage('unauthenticated'); setLoading(false); });
                     } else {
                         // For other updates, optionally re-fetch data
                         console.log('[AuthProvider Event] USER_UPDATED (Normal) -> Re-fetching details...');
                         setLoading(true);
                         fetchUserDetails(currentUser.id).catch(() => setLoading(false));
                     }
                 } else {
                     // Should not happen, but handle defensively
                     console.log('[AuthProvider Event] USER_UPDATED No User -> unauthenticated');
                     setAuthStage('unauthenticated');
                     setLoading(false);
                 }
                 break;
            case 'TOKEN_REFRESHED':
                 console.log('[AuthProvider Event] TOKEN_REFRESHED');
                 // Session is updated automatically, maybe re-fetch user details if needed
                 if (currentUser && authStage === 'authenticated') {
                     // Example: Fetch details only if profile is missing (optional)
                     // if (!profile) { 
                     //    setLoading(true);
                     //    fetchUserDetails(currentUser.id).catch(() => setLoading(false)); 
                     // } 
                 }
                 break;
            default:
                console.log('[AuthProvider Event] Unhandled event:', event);
        }
      }
    );

    // Cleanup listener
    return () => {
       console.log('[AuthProvider Listener Effect] Cleaning up listener.');
      authListener?.subscription.unsubscribe();
    };
  // Rerun listener setup only if initialStateDetermined changes to true
  }, [initialStateDetermined, fetchUserDetails, authStage]); // Added authStage to deps

  // Sign out function
  const signOut = async () => {
    setAuthStage('loading');
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
       setAuthStage('unauthenticated'); 
       setLoading(false);
    }
  };

  // Context value
  const value = {
    session,
    user,
    profile,
    role,
    permissions,
    loading,
    authStage,
    signOut,
  };

  // Log before providing value
  console.log('[AuthProvider Rendering] Providing context value:', {
    loading: value.loading,
    user: !!value.user,
    authStage: value.authStage
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 