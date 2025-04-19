import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
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
} from '@/types/auth'; // Assuming types are defined correctly

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
  // Flag to track if the initial load might be due to an invite/recovery flow
  const initialFlowType = useRef<'invite' | 'recovery' | null>(null);
  // Flag to prevent listener from processing initial state redundantly
  const initialCheckCompleted = useRef(false);

  // Ref to help log state reliably after potential async updates
  const authStageRef = useRef(authStage);
  useEffect(() => { authStageRef.current = authStage; }, [authStage]);

  // --- User Details Fetching ---
  const fetchUserDetails = useCallback(async (userId: string | undefined) => {
    if (!userId) {
        console.error("[AuthProvider] fetchUserDetails: No user ID provided.");
        setProfile(null); setRole(null); setPermissions({});
        return null;
    }
    console.log(`[AuthProvider] fetchUserDetails: START for user: ${userId}`);
    try {
      console.log(`[AuthProvider] fetchUserDetails: Calling RPC get_user_auth_details for user: ${userId}`);
      const { data, error, status } = await supabase.rpc('get_user_auth_details', { p_user_id: userId });
      console.log(`[AuthProvider] fetchUserDetails: RPC Result for ${userId}:`, { status, data, error });

      if (error) {
        console.error(`[AuthProvider] fetchUserDetails: RPC Error for ${userId}:`, error);
        throw error; // Let the main catch handle it
      }
      if (data && data.error) { // Check for application-level error within the RPC response
         console.error(`[AuthProvider] fetchUserDetails: Application Error in RPC response for ${userId}:`, data.error);
         throw new Error(data.error);
      }

      const details = data as UserAuthDetails | null;
      if (details) {
        console.log(`[AuthProvider] fetchUserDetails: SUCCESS for user ${userId}. Details:`, details);
        setProfile(details.profile); setRole(details.role); setPermissions(details.permissions || {});
        return details;
      } else {
        console.warn(`[AuthProvider] fetchUserDetails: No details returned for user ${userId}, returning null.`);
        setProfile(null); setRole(null); setPermissions({});
        return null;
      }
    } catch (error) {
      console.error(`[AuthProvider] fetchUserDetails: EXCEPTION for user ${userId}:`, error);
      setProfile(null); setRole(null); setPermissions({});
      // Even if we fail to fetch details, we should still consider the user authenticated
      // if they have a valid session - this prevents the loading state from getting stuck
      console.log(`[AuthProvider] fetchUserDetails: Despite error, returning minimal details for ${userId}.`);
      return { profile: null, role: null, permissions: {} }; // Return minimal valid details
    }
  }, []);

  // --- Initial State Determination (Mount Effect) ---
  useEffect(() => {
    console.log('[AuthProvider Mount] Checking initial state...');
    let recoveryDetected = false;
    
    // Check for recovery in hash or tokens in URL that indicate an invite link
    const url = window.location.href;
    const hasAccessToken = url.includes('access_token=');
    const hasRefreshToken = url.includes('refresh_token=');
    const hasRecoveryInHash = window.location.hash.includes('type=recovery');
    
    if (hasRecoveryInHash || (hasAccessToken && hasRefreshToken)) {
      console.log('[AuthProvider Mount] Detected recovery or invite link in URL.');
      recoveryDetected = true;
      
      // Only clear hash/tokens AFTER we've fully detected them and Supabase has processed them
      // This prevents interfering with the Supabase auth flow
      setTimeout(() => {
        if (window.location.hash || window.location.href.includes('access_token=')) {
          console.log('[AuthProvider] Cleaning URL parameters after detection');
          try {
            // Replace the current URL with a clean version (no hash, no query params)
            const cleanPath = window.location.pathname;
            window.history.replaceState(null, '', cleanPath);
          } catch (e) {
            console.error('[AuthProvider] Error cleaning URL:', e);
          }
        }
      }, 1000); // Increased delay to ensure Supabase has processed tokens
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
        console.log('[AuthProvider Mount] Initial session result:', { 
          initialSession: initialSession ? 'Session Exists' : null, 
          recoveryDetected,
          userId: initialSession?.user?.id
        });
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
        initialCheckCompleted.current = true; // Mark initial check complete
    }).catch(error => {
         console.error('[AuthProvider Mount] Error getting initial session:', error);
         setAuthStage('unauthenticated'); // Default to unauth on error
         setLoading(false);
         initialCheckCompleted.current = true;
    });

  }, [fetchUserDetails]); // Depend on fetchUserDetails

  // --- Auth State Change Listener ---
  useEffect(() => {
    console.log('[AuthProvider Listener Effect] Setting up onAuthStateChange listener.');

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log(`[AuthProvider Event: ${event}] Session User ID:`, currentSession?.user?.id);
        const currentUser = currentSession?.user ?? null;

        // Update session and user state immediately
        setSession(currentSession);
        setUser(currentUser);

        let nextAuthStage = authStageRef.current; // Get current stage via ref

        // Safeguard against prolonged loading
        const startTime = Date.now();
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        
        const timeoutCheck = (message = "Auth state change processing timeout") => {
          if (timeoutId) clearTimeout(timeoutId); // Clear any existing timeout

          if (Date.now() - startTime > 5000 && loading) {
            console.warn(`[AuthProvider Timeout] ${message}`);
            setLoading(false); // Always set loading false on timeout
            
            // DO NOT force authStage changes here. Let the natural flow handle it.
            // If it's stuck in needs_password_set, it should stay there.
            if (nextAuthStage === 'needs_password_set') {
              console.log('[AuthProvider Timeout] Keeping needs_password_set state, ending loading.');
            } else if (nextAuthStage === 'loading') {
              console.warn('[AuthProvider Timeout] Was stuck in loading, maybe unauthenticated?');
              // Optionally set to unauthenticated if stuck loading without a user?
              // if (!currentUser) setAuthStage('unauthenticated'); 
            }
          }
        };

        switch (event) {
            case 'INITIAL_SESSION':
                // This might fire after mount effect, handle setting stage if still loading
                console.log('[AuthProvider Event] INITIAL_SESSION received.');
                // IMPORTANT: Only process if initial check is complete AND we are still loading OR unauthenticated.
                // Do NOT interfere if the mount effect already set needs_password_set.
                if (initialCheckCompleted.current && (nextAuthStage === 'loading' || nextAuthStage === 'unauthenticated')) {
                    console.log('[AuthProvider Event] INITIAL_SESSION processing...');
                     if (currentUser) {
                        // Double-check for invite flow just in case mount missed it (shouldn't happen with current logic)
                        if (initialFlowType.current === 'invite' || initialFlowType.current === 'recovery') {
                            console.log(`[AuthProvider Event] INITIAL_SESSION setting stage to 'needs_password_set' (missed by mount?)`);
                            nextAuthStage = 'needs_password_set';
                            initialFlowType.current = null; // Consume the flag
                            setLoading(false); // Ensure loading is false
                        } else {
                            // Normal session found, fetch details (we know it's not authenticated yet)
                            console.log('[AuthProvider Event] INITIAL_SESSION fetching details...');
                            setLoading(true);
                            try {
                                await fetchUserDetails(currentUser.id);
                                nextAuthStage = 'authenticated';
                            } catch { nextAuthStage = 'unauthenticated'; }
                            finally { setLoading(false); }
                        }
                    } else {
                        // No user in initial session
                        console.log('[AuthProvider Event] INITIAL_SESSION No User -> unauthenticated');
                        nextAuthStage = 'unauthenticated';
                        setLoading(false);
                    }
                } else {
                    console.log(`[AuthProvider Event] INITIAL_SESSION ignored (Stage: ${nextAuthStage}, Initial Check: ${initialCheckCompleted.current})`);
                    // If the stage is already needs_password_set, ensure loading is false
                    if (nextAuthStage === 'needs_password_set') {
                        setLoading(false);
                    }
                }
                break;
            case 'SIGNED_IN':
                if (currentUser) {
                    // Check if this SIGNED_IN corresponds to the invite/recovery flow detected on mount
                    if (initialFlowType.current) {
                         console.log(`[AuthProvider Event] SIGNED_IN setting stage to 'needs_password_set' from initial flow type: ${initialFlowType.current}`);
                         nextAuthStage = 'needs_password_set';
                         initialFlowType.current = null; // Consume the flag
                         setLoading(false); // Stop loading now
                    } else if (nextAuthStage === 'unauthenticated') {
                         // Treat as a normal login only if coming from unauthenticated state
                         console.log('[AuthProvider Event] SIGNED_IN (Normal) -> fetching details...');
                         setLoading(true);
                         try {
                            await fetchUserDetails(currentUser.id);
                            nextAuthStage = 'authenticated';
                         } catch { nextAuthStage = 'unauthenticated'; }
                         finally { setLoading(false); }
                    } else {
                         console.log(`[AuthProvider Event] SIGNED_IN ignored (current stage: ${nextAuthStage}).`);
                    }
                } else {
                    console.warn('[AuthProvider Event] SIGNED_IN No User -> unauthenticated');
                    nextAuthStage = 'unauthenticated';
                    setLoading(false);
                }
                break;
             case 'SIGNED_OUT':
                 console.log('[AuthProvider Event] SIGNED_OUT -> unauthenticated');
                 setProfile(null); setRole(null); setPermissions({});
                 nextAuthStage = 'unauthenticated';
                 setLoading(false);
                 break;
            case 'PASSWORD_RECOVERY':
                 console.log('[AuthProvider Event] PASSWORD_RECOVERY -> needs_password_set');
                 nextAuthStage = 'needs_password_set';
                 setLoading(false);
                 // Clear hash if needed (might already be cleared by mount effect)
                 if (window.location.hash) {
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                 }
                 break;
            case 'USER_UPDATED':
                console.log('[AuthProvider Event] USER_UPDATED');
                if (currentUser) {
                    // If they were setting password, transition to authenticated after fetching details
                    if (nextAuthStage === 'needs_password_set') {
                        console.log('[AuthProvider Event] USER_UPDATED from needs_password_set -> preparing to fetch details...');
                        setLoading(true);
                        try {
                           // Add a small delay to let the UI show success state before transition
                           await new Promise(resolve => setTimeout(resolve, 1500));
                           console.log('[AuthProvider Event] Delayed fetch starting...');
                           
                           // Fetch user details
                           console.log('[AuthProvider Event] *** BEFORE calling fetchUserDetails ***');
                           const detailsResult = await fetchUserDetails(currentUser.id);
                           console.log('[AuthProvider Event] *** AFTER calling fetchUserDetails *** Result:', detailsResult ? 'Got Details' : 'No Details/Error Fallback');

                           console.log('[AuthProvider Event] Details fetched after password set, transitioning to authenticated');
                           nextAuthStage = 'authenticated';
                        } catch (error) { 
                           console.error('[AuthProvider Event] Error DURING/AFTER fetching details post-password set:', error);
                           // Even on error, proceed to authenticated if we have a valid user
                           nextAuthStage = 'authenticated';
                        }
                        finally { 
                           console.log('[AuthProvider Event] USER_UPDATED finally block starting. Setting loading = false.');
                           setLoading(false);
                           console.log('[AuthProvider Event] Finished processing USER_UPDATED, final stage attempt:', nextAuthStage);
                        }
                    } else if (nextAuthStage === 'authenticated') {
                        console.log('[AuthProvider Event] USER_UPDATED (Normal) -> Re-fetching details...');
                        setLoading(true);
                        fetchUserDetails(currentUser.id)
                           .catch(error => console.error('[AuthProvider] Error re-fetching details:', error))
                           .finally(() => setLoading(false));
                    }
                } else {
                    console.log('[AuthProvider Event] USER_UPDATED No User -> unauthenticated');
                    nextAuthStage = 'unauthenticated';
                    setLoading(false);
                }
                break;
            case 'TOKEN_REFRESHED':
                 console.log('[AuthProvider Event] TOKEN_REFRESHED');
                 if (currentUser && nextAuthStage === 'authenticated' && !profile) {
                    console.log('[AuthProvider Event] TOKEN_REFRESHED -> Re-fetching missing details...');
                    setLoading(true);
                    fetchUserDetails(currentUser.id).finally(() => setLoading(false));
                 }
                 break;
            default:
                console.log('[AuthProvider Event] Unhandled event:', event);
        }

        // Update the authStage state if it changed
        if (nextAuthStage !== authStageRef.current) {
             console.log(`[AuthProvider Event] Transitioning authStage from ${authStageRef.current} to ${nextAuthStage}`);
             setAuthStage(nextAuthStage);
             // Add log AFTER state update is triggered
             console.log(`[AuthProvider Event] setAuthStage called. New stage should be: ${nextAuthStage}`);
        } else {
             console.log(`[AuthProvider Event] Stage unchanged: ${nextAuthStage}, loading state: ${loading}`);
             // Add explicit check to ensure loading is false if stage is now authenticated
             if (nextAuthStage === 'authenticated' && loading) {
                console.warn('[AuthProvider Event] Stage is authenticated but loading is still true. Forcing loading=false.');
                setLoading(false);
             }
        }

        // Set a timeout to run the check once
        timeoutId = setTimeout(() => timeoutCheck(`Timeout after ${event} event`), 5000);
      }
    );

    // Cleanup listener
    return () => {
       console.log('[AuthProvider Listener Effect] Cleaning up listener.');
      authListener?.subscription.unsubscribe();
    };
  // Only dependency is fetchUserDetails (stable) and profile (for optional refresh)
  }, [fetchUserDetails, profile]); // Removed initialStateDetermined dependency

  // Sign out function
  const signOut = useCallback(async () => {
    console.log('[AuthProvider] Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[AuthProvider] Error signing out:', error);
    }
     console.log('[AuthProvider] Sign out initiated.');
     // State reset is handled by the SIGNED_OUT event listener
  }, []);

  // Context value using useMemo for stability
  const value = useMemo(() => ({
    session,
    user,
    profile,
    role,
    permissions,
    loading,
    authStage,
    signOut,
  }), [session, user, profile, role, permissions, loading, authStage, signOut]);

  // console.log('[AuthProvider Rendering] Providing context value:', { loading, authStage });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
