import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'user' | 'admin';
}

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser ?? null);
      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const profileRef = doc(db, 'users', userId, 'profile', '_');
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        setProfile({ id: userId, ...snap.data() } as Profile);
        return;
      }
      // Create profile for new user
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === userId) {
        const newProfile: Omit<Profile, 'id'> & { id?: string } = {
          email: currentUser.email ?? null,
          full_name: (currentUser.displayName || currentUser.email) ?? null,
          role: 'user',
        };
        await setDoc(profileRef, newProfile);
        await setDoc(doc(db, 'profiles', userId), {
          email: newProfile.email,
          full_name: newProfile.full_name,
          role: newProfile.role,
        });
        setProfile({ id: userId, ...newProfile } as Profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = profile?.role === 'admin';

  return {
    user,
    profile,
    isAdmin,
    loading,
    refreshProfile: () => user && fetchProfile(user.uid),
  };
}

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signOut() {
  return firebaseSignOut(auth);
}
