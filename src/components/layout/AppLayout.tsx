import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { MainNav } from './MainNav';

export function AppLayout() {
    return (
        <div className="min-h-screen bg-background">
            <MainNav />
            <main className="flex-1">
                <Outlet />
            </main>
            <Toaster />
        </div>
    );
} 