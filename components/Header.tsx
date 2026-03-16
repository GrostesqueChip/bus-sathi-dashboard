'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { LogOut, User } from 'lucide-react'; 

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
  if (pathname === '/login') return null;

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-20 flex-shrink-0 shadow-sm">
      <div className="px-6 py-3 flex justify-between items-center h-16">
        
        {/* Left side: Official Branding */}
        <div className="flex items-center gap-4">
          <img src="/logo-transparent.png" alt="Bus Sathi Logo" className="h-10 w-auto object-contain" />
          <div className="hidden sm:block">
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">Bus Sathi</h1>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">Command Center</p>
          </div>
        </div>

        {/* Right side: User Profile & Actions */}
        {user && (
          <div className="flex items-center gap-4 md:gap-6">


            {/* Admin User Info */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-black text-gray-900">
                  {user.displayName || 'System Admin'}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {user.email}
                </span>
              </div>
              
              {/* User Avatar Circle */}
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                <User size={20} strokeWidth={2.5} />
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 px-4 py-2 rounded-xl text-sm font-bold transition-all border border-gray-200 hover:border-red-200 shadow-sm ml-2"
              title="Secure Logout"
            >
              <LogOut size={16} strokeWidth={2.5} />
              <span className="hidden lg:inline">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}