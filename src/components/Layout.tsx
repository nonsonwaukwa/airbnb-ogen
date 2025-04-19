import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function Layout() {
  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col sm:gap-4 sm:py-4">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <Outlet /> {/* Child routes defined in App.tsx will render here */}
        </main>
      </div>
    </div>
  );
} 