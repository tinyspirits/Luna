import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../firebase';
import { getUserProfile } from '../services/firestore';
import type { UserProfile } from '../services/firestore';

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  reloadProfile: () => Promise<void>;
  usePartnerData: boolean;
  setUsePartnerData: (val: boolean) => void;
  viewingUid: string;
}

const AuthContext = createContext<AuthContextType>({ 
  currentUser: null, profile: null, loading: true, reloadProfile: async () => {},
  usePartnerData: false, setUsePartnerData: () => {}, viewingUid: ''
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const p = await getUserProfile(uid);
    setProfile(p);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchProfile(user.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const reloadProfile = async () => {
    if (currentUser) await fetchProfile(currentUser.uid);
  };

  const [usePartnerDataState, setUsePartnerData] = useState(false);
  const isMale = profile?.gender === 'male';
  const usePartnerData = isMale ? true : usePartnerDataState;
  const viewingUid = (usePartnerData && profile?.partnerUid) ? profile.partnerUid : (currentUser?.uid || '');

  const value = {
    currentUser,
    profile,
    loading,
    reloadProfile,
    usePartnerData,
    setUsePartnerData,
    viewingUid
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
