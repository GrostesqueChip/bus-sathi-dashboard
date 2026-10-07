'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  login: async () => {},
  logout: async () => {},
});

// SHA-256 hashes of lower-cased, trimmed admin e-mail addresses.
// NOTE: this only keeps the plaintext addresses out of the client bundle. It is
// NOT access control - anyone can read this file and the check runs in the
// browser. Real enforcement must come from Firestore security rules / custom
// claims (see ADMIN_SETUP.md). To add an admin, append the hash of the address:
//   node -e "console.log(require('crypto').createHash('sha256').update('admin@example.com'.trim().toLowerCase()).digest('hex'))"
const ADMIN_EMAIL_HASHES: readonly string[] = [
'51108b4cdb98a8d246604c6043e56bde1cc017d29048c896a664b87e98d2ab1e',
  'a8170062539a79eee3b411534a7d65ca4eabb729b636dfd0425a67fbab65a500',
  '81ef87096d5c87c44ffc8dd23d302b4c0322a7bfad535cdd5c3b9cca423c95d6',
  'eb22d6b835a628f0cba9ce09bcc717220824105b23e18d7e0b21b59bf07302b0',
];

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Resolves false on any error (missing e-mail, no Web Crypto, etc.).
async function isVipEmail(email: string | null | undefined): Promise<boolean> {
  try {
    if (!email) return false;
    const hash = await sha256Hex(email.trim().toLowerCase());
    return ADMIN_EMAIL_HASHES.includes(hash);
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
// Check if user has admin claim OR is on the (hashed) VIP list
      if (user) {
        const idTokenResult = await user.getIdTokenResult();
        const hasFirebaseBadge = !!idTokenResult.claims.admin;
        
        const isVipUser = await isVipEmail(user.email);

        // Let them in if they have the badge OR are on the VIP list
        setIsAdmin(hasFirebaseBadge || isVipUser);
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Force token refresh to get latest claims
      await result.user.getIdToken(true);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to login');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message || 'Failed to logout');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
