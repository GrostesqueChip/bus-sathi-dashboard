'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-50 flex items-center justify-center p-6 sm:p-12 overflow-hidden z-50">
      
      {/* Subtle Premium Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 pointer-events-none"></div>

      {/* Main Split-Layout Container */}
      <div className="relative z-10 w-full max-w-7xl flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">

        {/* LEFT SIDE: Official Branding (Now Vertically Centered & Bigger) */}
        <div className="flex-1 flex flex-col items-center justify-center text-center w-full">
          
          {/* Main Transparent Logo (SCALED UP) */}
          <img 
            src="/logo-transparent.png" 
            alt="Bus Sathi Icon" 
            className="h-48 sm:h-64 lg:h-72 w-auto drop-shadow-xl object-contain mb-8" 
          />
          
          {/* The 3 Language Logos */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mb-6">
            <img src="/english.png" alt="Bus Sathi English" className="h-8 sm:h-12 w-auto object-contain" />
            <div className="w-px h-8 sm:h-10 bg-gray-300"></div>
            <img src="/hindi.png" alt="Bus Sathi Hindi" className="h-8 sm:h-12 w-auto object-contain" />
            <div className="w-px h-8 sm:h-10 bg-gray-300"></div>
            <img src="/urdu.png" alt="Bus Sathi Urdu" className="h-8 sm:h-12 w-auto object-contain" />
          </div>

          <p className="text-sm sm:text-base lg:text-lg text-gray-600 font-bold tracking-widest uppercase">
            Dashboard for the the Bus Sathi App
          </p>
        </div>

        {/* RIGHT SIDE: Login Card */}
        <div className="w-full max-w-md lg:max-w-lg">
          <div className="bg-white/90 backdrop-blur-sm py-10 px-6 sm:px-10 shadow-2xl rounded-3xl border border-white/50">
            
            <form className="space-y-6 sm:space-y-8" onSubmit={handleSubmit}>
              
              {/* Error Message Box */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm sm:text-base text-red-700 font-medium">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                  Official Email
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-4 sm:px-5 py-3 sm:py-4 border border-gray-200 rounded-2xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base transition-all bg-gray-50/50 focus:bg-white"
                    placeholder="Enter official email"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-4 sm:px-5 py-3 sm:py-4 border border-gray-200 rounded-2xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base transition-all bg-gray-50/50 focus:bg-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full flex justify-center py-3 sm:py-4 px-5 border border-transparent rounded-2xl shadow-md text-sm sm:text-base font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? (
                    <span className="flex items-center gap-2 sm:gap-3">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Authenticating...
                    </span>
                  ) : (
                    'Sign In Securely'
                  )}
                </button>
              </div>
              
            </form>
          </div>
        </div>
      </div>

      {/* Powered By Karroh Footer */}
      <div className="fixed bottom-6 w-full flex justify-center z-10 pointer-events-none">
        <div className="flex flex-col items-center opacity-80">
          <span className="text-xs sm:text-sm text-gray-500 font-bold mb-1 sm:mb-2 uppercase tracking-widest">Powered by</span>
          <img src="/karroh.png" alt="Karroh Logo" className="h-6 sm:h-8 w-auto object-contain" />
        </div>
      </div>

    </div>
  );
}