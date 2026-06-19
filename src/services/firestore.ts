import { doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { calculatePredictions } from '../utils/cycleCalculations';
import type { UserSettings } from '../utils/cycleCalculations';

export interface DailyLog {
  date: Date;
  bleeding: 'light' | 'medium' | 'heavy' | null;
  symptoms: string[];
  mood: string[];
  notes?: string;
}

export interface Cycle {
  id?: string;
  startDate: Date;
  endDate: Date | null;
  expectedNextPeriod: Date;
  expectedOvulation: Date;
}

export interface UserProfile {
  uid: string;
  partnerUid?: string;
  themeBackground?: string;
  periodIcon?: string;
}

// Convert Firestore Timestamp to Date, safely
const toDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  return new Date(timestamp);
};

export const getUserSettings = async (userId: string): Promise<UserSettings> => {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserSettings;
  }
  // Default settings
  return { averageCycleLength: 28, averagePeriodLength: 5 };
};

export const saveUserSettings = async (userId: string, settings: UserSettings) => {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, settings, { merge: true });
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserProfile;
  }
  return null;
};

export const linkPartner = async (userId: string, partnerUid: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { partnerUid }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error linking partner:", error);
    return false;
  }
};

export const updateUserProfile = async (userId: string, data: Partial<UserProfile>) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error("Error updating profile:", error);
    return false;
  }
};

export const uploadBackgroundImage = async (userId: string, file: File): Promise<string | null> => {
  try {
    // Tự động thêm timestamp để tránh cache trình duyệt khi đổi ảnh mới
    const fileRef = ref(storage, `users/${userId}/background_${Date.now()}`);
    await uploadBytes(fileRef, file);
    const downloadUrl = await getDownloadURL(fileRef);
    
    // Lưu URL vào Profile
    await updateUserProfile(userId, { themeBackground: `url(${downloadUrl})` });
    return downloadUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
};

export const getLatestCycle = async (userId: string): Promise<Cycle | null> => {
  try {
    const cyclesRef = collection(db, 'users', userId, 'cycles');
    const q = query(cyclesRef, orderBy('startDate', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        startDate: toDate(data.startDate)!,
        endDate: toDate(data.endDate),
        expectedNextPeriod: toDate(data.expectedNextPeriod)!,
        expectedOvulation: toDate(data.expectedOvulation)!,
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting latest cycle:", error);
    return null;
  }
};

export const startNewCycle = async (userId: string, startDate: Date, userSettings: UserSettings) => {
  try {
    const predictions = calculatePredictions(startDate, userSettings);

    const cycleData = {
      startDate,
      endDate: null,
      expectedNextPeriod: predictions.nextPeriodStart,
      expectedOvulation: predictions.ovulationDate,
    };

    const cyclesRef = collection(db, 'users', userId, 'cycles');
    await addDoc(cyclesRef, cycleData);

    // Also create a daily log for bleeding
    const dateString = startDate.toISOString().split('T')[0];
    await saveDailyLog(userId, dateString, {
      date: startDate,
      bleeding: 'medium',
      symptoms: [],
      mood: []
    });
    
    return true;
  } catch (error) {
    console.error("Error starting new cycle:", error);
    return false;
  }
};

export const addHistoricalCycle = async (userId: string, startDate: Date, endDate: Date, userSettings: UserSettings) => {
  try {
    const predictions = calculatePredictions(startDate, userSettings);
    const cycleData = {
      startDate,
      endDate,
      expectedNextPeriod: predictions.nextPeriodStart,
      expectedOvulation: predictions.ovulationDate,
    };
    const cyclesRef = collection(db, 'users', userId, 'cycles');
    await addDoc(cyclesRef, cycleData);
    return true;
  } catch (error) {
    console.error("Error adding historical cycle:", error);
    return false;
  }
};

export const saveDailyLog = async (userId: string, dateString: string, logData: Partial<DailyLog>) => {
  try {
    const logRef = doc(db, 'users', userId, 'dailyLogs', dateString);
    await setDoc(logRef, logData, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving daily log:", error);
    return false;
  }
};

export const getDailyLog = async (userId: string, dateString: string): Promise<DailyLog | null> => {
  try {
    const logRef = doc(db, 'users', userId, 'dailyLogs', dateString);
    const docSnap = await getDoc(logRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        date: toDate(data.date)!
      } as DailyLog;
    }
    return null;
  } catch (error) {
    console.error("Error getting daily log:", error);
    return null;
  }
};
