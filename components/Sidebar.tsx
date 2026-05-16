'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LayoutDashboard, Map as MapIcon, Contact, FolderClock, AlertOctagon, GitBranch } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { title: "Executive Summary", path: "/", icon: LayoutDashboard },
    { title: "Route Analysis Map", path: "/map-visualizer", icon: MapIcon },
    { title: "Route Rationalization", path: "/route-rationalization", icon: GitBranch },
    { title: "V3 Route Plan", path: "/route-rationalization-v3", icon: GitBranch },
    { title: "Kashmir Route Plan", path: "/route-rationalization-kashmir", icon: GitBranch },
    { title: "Driver Database", path: "/registered-drivers", icon: Contact },
    { title: "Data & Trip Logs", path: "/trip-logs", icon: FolderClock },
    { title: "Flagged Anomalies", path: "/flagged-trips", icon: AlertOctagon },
  ];

  return (
    <div 
      className={`h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 z-50 shadow-sm ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Header / Hamburger */}
      <div className={`h-20 flex items-center border-b border-gray-100 px-6 ${isCollapsed ? 'justify-center' : 'justify-start gap-4'}`}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition-colors shrink-0"
        >
          <Menu size={24} strokeWidth={2.5} />
        </button>
        
        {!isCollapsed && (
          <span className="font-black text-gray-800 tracking-widest uppercase text-sm whitespace-nowrap overflow-hidden">
            Main Menu
          </span>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 flex flex-col gap-2 px-4 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center rounded-2xl transition-all duration-200 group ${
                isCollapsed ? 'justify-center p-3' : 'justify-start px-4 py-3.5 gap-4'
              } ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
              }`}
              title={isCollapsed ? item.title : ''}
            >
              <Icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 2} 
                className={`shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`} 
              />
              
              {!isCollapsed && (
                <span className={`font-bold text-sm whitespace-nowrap overflow-hidden transition-all ${
                  isActive ? 'text-blue-800' : 'text-gray-600'
                }`}>
                  {item.title}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Branding */}
      <div className={`p-6 border-t border-gray-100 flex items-center ${isCollapsed ? 'justify-center' : 'justify-start gap-3'}`}>
        {!isCollapsed && (
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
            Powered By
          </span>
        )}
        <img 
          src="/karroh.png" 
          alt="Karroh" 
          className={`object-contain opacity-60 grayscale transition-all ${
            isCollapsed ? 'h-4 w-auto' : 'h-5 w-auto'
          }`} 
        />
      </div>
    </div>
  );
}
