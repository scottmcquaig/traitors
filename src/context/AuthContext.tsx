'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

/**
 * Extended user type with additional app-specific properties
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  // TODO: Add app-specific user properties
  // role?: 'admin' | 'user';
  // leagueIds?: string[];
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Maps Firebase user to our AuthUser type
 */
function mapFirebaseUser(firebaseUser: FirebaseUser | null): AuthUser | null {
  if (!firebaseUser) return null;

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  };
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // TODO: Subscribe to Firebase auth state changes
    // import { auth } from '@/lib/firebase';
    // import { onAuthStateChanged } from 'firebase/auth';
    //
    // const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    //   setUser(mapFirebaseUser(firebaseUser));
    //   setLoading(false);
    // });
    //
    // return () => unsubscribe();

    // Placeholder: simulate auth check
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    // TODO: Implement Firebase sign in
    // import { signInWithEmailAndPassword } from 'firebase/auth';
    // import { auth } from '@/lib/firebase';
    //
    // try {
    //   setError(null);
    //   await signInWithEmailAndPassword(auth, email, password);
    // } catch (err) {
    //   setError(err instanceof Error ? err : new Error('Sign in failed'));
    //   throw err;
    // }
    
    console.log('TODO: Implement signIn', { email, password });
    throw new Error('signIn not implemented');
  };

  const signInWithGoogle = async (): Promise<void> => {
    // TODO: Implement Google sign in
    // import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
    // import { auth } from '@/lib/firebase';
    //
    // try {
    //   setError(null);
    //   const provider = new GoogleAuthProvider();
    //   await signInWithPopup(auth, provider);
    // } catch (err) {
    //   setError(err instanceof Error ? err : new Error('Google sign in failed'));
    //   throw err;
    // }
    
    console.log('TODO: Implement signInWithGoogle');
    throw new Error('signInWithGoogle not implemented');
  };

  const signOut = async (): Promise<void> => {
    // TODO: Implement Firebase sign out
    // import { signOut as firebaseSignOut } from 'firebase/auth';
    // import { auth } from '@/lib/firebase';
    //
    // try {
    //   await firebaseSignOut(auth);
    // } catch (err) {
    //   setError(err instanceof Error ? err : new Error('Sign out failed'));
    //   throw err;
    // }
    
    console.log('TODO: Implement signOut');
    throw new Error('signOut not implemented');
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    // TODO: Implement Firebase sign up
    // import { createUserWithEmailAndPassword } from 'firebase/auth';
    // import { auth } from '@/lib/firebase';
    //
    // try {
    //   setError(null);
    //   await createUserWithEmailAndPassword(auth, email, password);
    // } catch (err) {
    //   setError(err instanceof Error ? err : new Error('Sign up failed'));
    //   throw err;
    // }
    
    console.log('TODO: Implement signUp', { email, password });
    throw new Error('signUp not implemented');
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    signIn,
    signInWithGoogle,
    signOut,
    signUp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 * Must be used within an AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
