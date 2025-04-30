import { NavLink } from 'react-router-dom';
import { useAuth } from '@/app/AuthProvider';
import { cn } from '@/lib/utils'; // For conditional classes
import {
  LayoutDashboard,
  Building2, // Properties
  CalendarDays, // Bookings
  FileText, // Invoices (Add this icon)
  Boxes, // Inventory
  ShoppingCart, // Sales
  Truck, // Procurement
  CircleAlert, // Issues
  Users, // Staff
  Settings, // Settings
  Package, // Placeholder for Logo/Brand
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
  { to: '/properties', label: 'Properties', icon: Building2, permission: 'view_properties' },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays, permission: 'view_bookings' },
  { to: '/invoices', label: 'Invoices', icon: FileText, permission: 'view_invoices' },
  { to: '/inventory', label: 'Inventory', icon: Boxes, permission: 'view_inventory' },
  { to: '/sales', label: 'Sales', icon: ShoppingCart, permission: 'view_sales' },
  { to: '/procurement', label: 'Procurement', icon: Truck, permission: 'view_procurement' },
  { to: '/issues', label: 'Issues', icon: CircleAlert, permission: 'view_issues' },
  { to: '/staff', label: 'Staff', icon: Users, permission: 'view_staff' },
  // Updated Settings link to point to the default settings page
  // Show Settings link if user can view EITHER roles OR suppliers (expand as needed)
  { to: '/settings/roles', label: 'Settings', icon: Settings, permission: ['view_roles', 'edit_roles', 'view_suppliers'] },
];

export function Sidebar() {
  const { permissions } = useAuth();

  // Basic function to check if any required permission is met
  const hasPermission = (requiredPermission?: string | string[]): boolean => {
    if (!requiredPermission) return true; // Assume visible if no permission specified

    const permissionsToCheck = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

    // Check if *any* of the required permissions are present and true
    return permissionsToCheck.some(p => permissions[p] === true);
  };

  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-slate-50 dark:border-slate-800 dark:bg-slate-950 lg:flex">
      {/* Logo Area */}
      <div className="flex h-16 items-center justify-center border-b px-6 dark:border-slate-800">
        <NavLink to="/" className="flex items-center gap-2 font-semibold">
          <Package className="h-6 w-6 text-sky-600" />
          <span className="">Ogen App</span>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navItems.map((item) =>
            hasPermission(item.permission) ? (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  // Use startsWith for parent route highlighting if needed, but NavLink usually handles nested
                  // No `end` prop needed for /settings parent link
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-50',
                      // isActive check should work for nested routes like /settings/roles when link is /settings/roles
                      isActive && 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-50'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              </li>
            ) : null // Don't render the item if permission check fails
          )}
        </ul>
      </nav>

      {/* Optional Footer Area */}
      {/* <div className="mt-auto border-t p-4 dark:border-slate-800">
          Footer Content
      </div> */}
    </aside>
  );
} 
