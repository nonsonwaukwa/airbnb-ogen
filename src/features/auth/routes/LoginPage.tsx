import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom'; // Assuming usage of react-router-dom
import { supabase } from '@/config/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Use Label directly if not using shadcn Form component fully
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react'; // For loading spinner

// Define the Zod schema for validation
const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setError(null); // Clear previous errors
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) {
        throw signInError;
      }

      // On successful login, show success message and manually navigate
      toast.success('Login successful! Redirecting...');
      
      // Wait a brief moment for Supabase to finalize the auth state
      setTimeout(() => {
        console.log("[LoginPage] Login successful, manually navigating to dashboard");
        navigate('/'); // Explicitly navigate to the dashboard
      }, 1000);

    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.message || 'An unexpected error occurred during login.';
      setError(errorMessage);
      toast.error(errorMessage); // Show error toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-r from-[#f0f9ff] to-[#e6f7ff] font-sans">
      <div className="flex w-full max-w-[1100px] min-h-[80vh] overflow-hidden rounded-xl bg-white shadow-lg">
        {/* Left Side: Image Grid with Stats */}
        <div className="flex flex-1 relative bg-[linear-gradient(rgba(0,0,0,0.25),rgba(0,0,0,0.25)),url('https://images.unsplash.com/photo-1497215842964-222b430dc094?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-3 p-5">
            <div className="col-span-1 row-start-2 bg-[rgba(239,114,77,0.9)] p-6 rounded-lg text-white flex flex-col justify-center">
              <div className="text-4xl font-bold mb-1">41%</div>
              <div className="text-sm leading-relaxed">of recruiters say entry-level positions are the hardest to fill.</div>
            </div>
            <div className="col-span-1 col-start-2 row-start-2 bg-[rgba(75,186,129,0.9)] p-6 rounded-lg text-white flex flex-col justify-center">
              <div className="text-4xl font-bold mb-1">76%</div>
              <div className="text-sm leading-relaxed">of hiring managers admit attracting the right job candidates is their greatest challenge.</div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex flex-1 flex-col justify-center items-center p-10">
          <div className="w-full max-w-[360px]">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Sign in to <span className="text-indigo-500 font-bold">Ogen</span></h2>
              <p className="text-sm text-gray-500 mb-5">Welcome back! Please enter your login details below to using the app.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 block">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className={`w-full px-3 py-2 rounded-md border ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 block">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className={`w-full px-3 py-2 rounded-md border ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              <a href="#" className="text-sm text-indigo-500 hover:text-indigo-600 text-right block">Forgot the password?</a>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <Button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Login'
                )}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-2 text-xs text-gray-400">OR</span>
                </div>
              </div>

              <button type="button" className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50">
                <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                Sign in with Google
              </button>

              <div className="mt-6 text-center text-sm text-gray-500">
                Don't have an account? <a href="#" className="text-indigo-500 font-medium hover:text-indigo-600">Sign up</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 