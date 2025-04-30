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
  hasPermission: () => false,
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
        console.error("[AuthProvider] No user ID provided to fetchUserDetails");
        setProfile(null); setRole(null); setPermissions({});
        return null;
    }
    console.log(`[AuthProvider] Fetching details for user: ${userId}`);
    try {
      const { data, error } = await supabase.rpc('get_user_auth_details', { p_user_id: userId });
      if (error) throw error;
      if (data && data.error) throw new Error(data.error);

      const details = data as UserAuthDetails | null;
      console.log('[AuthProvider] Fetched user details:', details);
      if (details) {
        setProfile(details.profile); setRole(details.role); setPermissions(details.permissions || {});
        return details;
      } else {
        setProfile(null); setRole(null); setPermissions({});
        console.warn('[AuthProvider] No user details returned from RPC for user:', userId);
        return null;
      }
    } catch (error) {
      console.error('[AuthProvider] Caught exception fetching user details:', error);
      setProfile(null); setRole(null); setPermissions({});
      throw error; // Re-throw
    }
  }, []);

  // --- Initial State Determination (Mount Effect) ---
  useEffect(() => {
    console.log('[AuthProvider Mount] Checking initial state...');
    let recoveryDetected = false;
    
    // Check for recovery in hash or tokens in URL that indicate an invite link
    const url = window.location.href;
    if (window.location.hash.includes('type=recovery') || 
        (url.includes('access_token=') && url.includes('refresh_token='))) {
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

        switch (event) {
            case 'INITIAL_SESSION':
                // This might fire after mount effect, handle setting stage if still loading
                console.log('[AuthProvider Event] INITIAL_SESSION received.');
                if (nextAuthStage === 'loading' && initialCheckCompleted.current) {
                     if (currentUser) {
                        // Check if it was an invite/recovery flow missed by mount effect
                        if (initialFlowType.current) {
                            console.log(`[AuthProvider Event] INITIAL_SESSION setting stage to 'needs_password_set' from initial flow type: ${initialFlowType.current}`);
                            nextAuthStage = 'needs_password_set';
                            initialFlowType.current = null; // Consume the flag
                            setLoading(false);
                        } else {
                            console.log('[AuthProvider Event] INITIAL_SESSION fetching details...');
                            setLoading(true);
                            try {
                                await fetchUserDetails(currentUser.id);
                                nextAuthStage = 'authenticated';
                            } catch { nextAuthStage = 'unauthenticated'; }
                            finally { setLoading(false); }
                        }
                    } else {
                        nextAuthStage = 'unauthenticated';
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
                         console.log('[AuthProvider Event] USER_UPDATED from needs_password_set -> fetching details...');
                         setLoading(true);
                         try {
                            await fetchUserDetails(currentUser.id);
                            nextAuthStage = 'authenticated';
                         } catch { nextAuthStage = 'unauthenticated'; }
                         finally { setLoading(false); }
                     } else if (nextAuthStage === 'authenticated') {
                         console.log('[AuthProvider Event] USER_UPDATED (Normal) -> Re-fetching details...');
                         setLoading(true);
                         fetchUserDetails(currentUser.id).finally(() => setLoading(false));
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
        } else {
             // If stage didn't change but loading might have, ensure loading is false if not handled above
             if (event !== 'TOKEN_REFRESHED' && event !== 'USER_UPDATED' && loading) {
                // setLoading(false); // Be careful not to cause loops
             }
        }
      }
    );

    // Cleanup listener
    return () => {
       console.log('[AuthProvider Listener Effect] Cleaning up listener.');
      authListener?.subscription.unsubscribe();
    };
  // Only dependency is fetchUserDetails (stable) and profile (for optional refresh)
  }, [fetchUserDetails, profile]); // Removed initialStateDetermined dependency

  // Permission checking
  const hasPermission = useCallback((permission: string): boolean => {
    // If loading or no permissions loaded, deny access
    if (loading || !permissions) return false;
    
    // Check if the permission exists and is true
    return !!permissions[permission];
  }, [loading, permissions]);

  // Memoize the context value
  const contextValue = useMemo(() => ({
    session,
    user,
    profile,
    role,
    permissions,
    loading,
    authStage,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    hasPermission,
  }), [session, user, profile, role, permissions, loading, authStage, hasPermission]);

  // console.log('[AuthProvider Rendering] Providing context value:', { loading, authStage });

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
