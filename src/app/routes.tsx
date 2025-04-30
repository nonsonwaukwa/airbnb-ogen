import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { issueRoutes } from '@/features/issues/routes';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <AppLayout />,
        children: [
            // Dashboard route
            {
                index: true,
                lazy: () => import('@/pages/DashboardPage').then(({ DashboardPage }) => ({ 
                    element: <DashboardPage /> 
                })),
            },

            // Issue routes
            ...issueRoutes,

            // Other feature routes...

            // Error/Not Found route
            {
                path: '*',
                lazy: () => import('@/pages/NotFoundPage').then(({ NotFoundPage }) => ({ 
                    element: <NotFoundPage /> 
                })),
            },
        ],
    },
]); 