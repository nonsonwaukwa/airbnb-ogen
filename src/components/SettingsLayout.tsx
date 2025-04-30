import { Outlet, NavLink } from 'react-router-dom';
import { cn } from "@/lib/utils";

// Define navigation links for the settings area
const settingsNavLinks = [
  // { name: 'Profile', href: '/settings/profile' }, // Placeholder
  { name: 'Roles & Permissions', href: '/settings/roles' },
  { name: 'Suppliers', href: '/settings/suppliers' },
  { name: 'Application', href: '/settings/application' },
  // Add other settings links here later (e.g., Billing, Application)
];

export function SettingsLayout() {
  return (
    <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
      {/* Left Sidebar Navigation */}
      <aside className="-mx-4 lg:w-1/5">
        <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
          {settingsNavLinks.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end // Use end prop for exact matching on parent routes
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  isActive
                    ? "bg-muted hover:bg-muted text-primary"
                    : "hover:bg-transparent hover:underline text-muted-foreground",
                  "justify-start" // Ensure text aligns left in vertical layout
                )
              }
            >
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:max-w-4xl">
        {/* Outlet renders the matched child route's component */}
        <Outlet /> 
      </div>
    </div>
  );
} 
