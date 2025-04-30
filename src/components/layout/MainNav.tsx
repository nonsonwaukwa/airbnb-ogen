import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/AuthProvider';
import { UserMenu } from './UserMenu';

const mainNavItems = [
    {
        title: 'Dashboard',
        href: '/',
        permission: null, // No permission needed
    },
    {
        title: 'Issues',
        href: '/issues',
        permission: 'issues.view',
    },
    // Add other nav items here
];

export function MainNav() {
    const location = useLocation();
    const { hasPermission } = useAuth();

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
                <div className="mr-4 hidden md:flex">
                    <Link to="/" className="mr-6 flex items-center space-x-2">
                        <span className="hidden font-bold sm:inline-block">
                            Ogen App
                        </span>
                    </Link>
                    <nav className="flex items-center space-x-6 text-sm font-medium">
                        {mainNavItems.map((item) => {
                            // Skip items that require permissions the user doesn't have
                            if (item.permission && !hasPermission(item.permission)) {
                                return null;
                            }

                            const isActive = location.pathname === item.href;
                            
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={cn(
                                        "transition-colors hover:text-foreground/80",
                                        isActive ? "text-foreground" : "text-foreground/60"
                                    )}
                                >
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
                    <div className="w-full flex-1 md:w-auto md:flex-none">
                        {/* Add search or other controls here */}
                    </div>
                    <UserMenu />
                </div>
            </div>
        </header>
    );
} 