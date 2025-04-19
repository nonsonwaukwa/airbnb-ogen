import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/config/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/app/AuthProvider'; // To potentially sign out or check state

// Zod schema for password validation
const setPasswordSchema = z.object({
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' })
      // Add more complexity rules if needed (e.g., regex for numbers, symbols)
      ,
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // Path of error
});

type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

export function SetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordSetSuccess, setPasswordSetSuccess] = useState(false);
  const { user, authStage } = useAuth(); // Get user info and auth state

  // Use this effect to log auth stage changes for debugging
  useEffect(() => {
    console.log('[SetPasswordPage] Current authStage:', authStage);
  }, [authStage]);

  // Ensure we have clean URLs with no tokens
  useEffect(() => {
    // Clean leftover URL parameters if any to prevent issues
    // But delay this to ensure authentication processing completes first
    const timer = setTimeout(() => {
      if (window.location.hash || window.location.search.includes('token')) {
        const cleanPath = window.location.pathname;
        try {
          window.history.replaceState(null, '', cleanPath);
          console.log('[SetPasswordPage] Cleaned URL parameters after delay');
        } catch (e) {
          console.error('[SetPasswordPage] Error cleaning URL:', e);
        }
      }
    }, 1500); // Delay the URL cleaning to avoid interfering with auth flow
    
    return () => clearTimeout(timer);
  }, []);

  // If the auth stage changes from needs_password_set to something else 
  // before the user has a chance to set password, change it back
  useEffect(() => {
    if (authStage === 'authenticated' && !passwordSetSuccess) {
      console.log('[SetPasswordPage] Auth stage changed to authenticated prematurely, user still needs to set password');
      // Get URL to check if this was an invite link
      const url = window.location.href;
      if (url.includes('/set-password') || window.location.pathname === '/set-password') {
        console.log('[SetPasswordPage] On set-password page, keeping this view active');
      }
    }
  }, [authStage, passwordSetSuccess]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
  });

  const onSubmit = async (values: SetPasswordFormValues) => {
    if (passwordSetSuccess) {
      console.log('[SetPasswordPage] Password already set successfully, ignoring duplicate submission');
      return; // Prevent multiple submissions after success
    }

    setLoading(true);
    setError(null);
    try {
      console.log('[SetPasswordPage] Attempting to update user password...');
      const { error: updateError, data } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (updateError) {
        throw updateError;
      }

      console.log('[SetPasswordPage] Password updated successfully!', data);
      setPasswordSetSuccess(true);
      toast.success('Password set successfully! Redirecting to dashboard...');
      
      // Removed manual navigation - AuthProvider state change should trigger redirect
      console.log('[SetPasswordPage] Password set. AuthProvider listener should handle redirect.');
      
    } catch (err: any) {
      console.error('[SetPasswordPage] Set password error:', err);
      const errorMessage = err.message || 'An unexpected error occurred setting the password.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false); // Ensure loading spinner stops regardless of outcome
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md dark:bg-slate-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Set Your Password
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Welcome! Please create a password for your account {user?.email ? `(${user.email})` : ''}.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              disabled={loading || passwordSetSuccess}
              {...register('password')}
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              disabled={loading || passwordSetSuccess}
              {...register('confirmPassword')}
              className={errors.confirmPassword ? 'border-red-500' : ''}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {error && (
            <p className="text-center text-sm text-red-600">{error}</p>
          )}

          {passwordSetSuccess && (
            <p className="text-center text-sm text-green-600">
              Password set successfully! You will be redirected to the dashboard...
            </p>
          )}

          <div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || passwordSetSuccess}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting Password...
                </>
              ) : passwordSetSuccess ? (
                'Password Set Successfully'
              ) : (
                'Set Password & Continue'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 