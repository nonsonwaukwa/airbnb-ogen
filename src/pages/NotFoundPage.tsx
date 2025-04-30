import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="container mx-auto py-16">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
                <p className="text-muted-foreground">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <Button onClick={() => navigate('/')} variant="default">
                    <Home className="mr-2 h-4 w-4" />
                    Back to Home
                </Button>
            </div>
        </div>
    );
} 