'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Don't show header on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <header className="bg-primary-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">🚌 Bus Tracker Dashboard</h1>
        {user && (
          <div className="flex items-center gap-4">
            <span className="text-sm">
              {user.displayName || user.email}
            </span>
            <button
              onClick={handleLogout}
              className="bg-primary-700 hover:bg-primary-800 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
