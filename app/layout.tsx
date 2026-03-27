import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/authContext'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import ChatWidget from '@/components/ChatWidget'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Bus Sathi | Command Center',
  description: 'Official RTO Fleet Management Dashboard',
  icons: {
    icon: '/logo.png', // This will pull the logo you already have in your public folder!
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="flex h-screen w-full bg-gray-50 overflow-hidden text-gray-900">
            
            {/* Our new collapsible sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <Header />
              
              <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                  {children}
                </div>
              </main>
            </div>
            
            <ChatWidget />
          </div>
        </AuthProvider>        
      </body>
    </html>
  )
}