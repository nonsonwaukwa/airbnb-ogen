import { Link } from 'react-router-dom';
import { useAuth } from '@/app/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Assuming Avatar is added via shadcn
import { Bell, LogOut, UserCircle, Settings } from 'lucide-react'; // Added Settings icon
import { Skeleton } from '@/components/ui/skeleton'; // Assuming Skeleton is added via shadcn

export function Header() {
  const { profile, role, signOut, loading } = useAuth();

  const getInitials = (name: string | undefined | null): string => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      {/* Can add Breadcrumbs or Page Title here later */}
      <div className="relative ml-auto flex items-center gap-4 md:grow-0">
         {/* Notification Bell (Placeholder) */}
         <Button variant="outline" size="icon" className="h-8 w-8">
             <Bell className="h-4 w-4" />
             <span className="sr-only">Toggle notifications</span>
         </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="overflow-hidden rounded-full h-8 w-8"
            >
              {loading ? (
                 <Skeleton className="h-8 w-8 rounded-full" />
              ) : (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? 'User'} />
                  <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
                </Avatar>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                 {loading ? (
                    <>
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                    </>
                 ) : (
                    <>
                        <p className="text-sm font-medium leading-none">
                            {profile?.full_name || 'Loading...'}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {role?.name || 'Loading...'}
                        </p>
                    </>
                 )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center cursor-pointer"> {/* Add link to profile page if needed */}
                   <UserCircle className="mr-2 h-4 w-4" />
                   <span>Profile</span>
                </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
               <Link to="/settings" className="flex items-center cursor-pointer"> {/* Add link to settings page if needed */}
                 <Settings className="mr-2 h-4 w-4" />
                 <span>Settings</span>
                </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer">
               <LogOut className="mr-2 h-4 w-4" />
               <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
} 