import { doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
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
  partnerName?: string;
  gender?: 'male' | 'female';
  partnerGender?: 'male' | 'female';
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

export const linkPartner = async (userId: string, partnerUid: string, partnerName?: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const partnerRef = doc(db, 'users', partnerUid);
    
    // Fetch both profiles to get genders
    const userSnap = await getDoc(userRef);
    const partnerSnap = await getDoc(partnerRef);
    
    const userGender = userSnap.exists() ? userSnap.data().gender : undefined;
    const partnerGender = partnerSnap.exists() ? partnerSnap.data().gender : undefined;

    await setDoc(userRef, { partnerUid, partnerName: partnerName || 'Bạn đời', partnerGender: partnerGender || deleteField() }, { merge: true });
    
    // Two-way connection: link the partner back to this user
    await setDoc(partnerRef, { partnerUid: userId, partnerName: 'Bạn đời', partnerGender: userGender || deleteField() }, { merge: true });
    
    return true;
  } catch (error) {
    console.error("Error linking partner:", error);
    return false;
  }
};

export const unlinkPartner = async (userId: string, partnerUid: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { partnerUid: deleteField(), partnerName: deleteField(), partnerGender: deleteField() }, { merge: true });
    
    // Two-way connection: unlink the partner as well
    const partnerRef = doc(db, 'users', partnerUid);
    await setDoc(partnerRef, { partnerUid: deleteField(), partnerName: deleteField(), partnerGender: deleteField() }, { merge: true });
    
    return true;
  } catch (error) {
    console.error("Error unlinking partner:", error);
    return false;
  }
};

export const updateUserProfile = async (userId: string, data: Partial<UserProfile>) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, data, { merge: true });

    // If gender was updated and user has a partner, update the partner's partnerGender
    if (data.gender) {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.partnerUid) {
          const partnerRef = doc(db, 'users', userData.partnerUid);
          await setDoc(partnerRef, { partnerGender: data.gender }, { merge: true });
        }
      }
    }
    return true;
  } catch (error) {
    console.error("Error updating profile:", error);
    return false;
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

export const getAllCycles = async (userId: string): Promise<Cycle[]> => {
  try {
    const cyclesRef = collection(db, 'users', userId, 'cycles');
    const q = query(cyclesRef, orderBy('startDate', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        startDate: toDate(data.startDate)!,
        endDate: toDate(data.endDate),
        expectedNextPeriod: toDate(data.expectedNextPeriod)!,
        expectedOvulation: toDate(data.expectedOvulation)!,
      };
    });
  } catch (error) {
    console.error("Error getting all cycles:", error);
    return [];
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

export const deleteCycle = async (userId: string, cycleId: string) => {
  try {
    const cycleRef = doc(db, 'users', userId, 'cycles', cycleId);
    await deleteDoc(cycleRef);
    return true;
  } catch (error) {
    console.error("Error deleting cycle:", error);
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

export const getAllDailyLogs = async (userId: string): Promise<DailyLog[]> => {
  try {
    const logsRef = collection(db, 'users', userId, 'dailyLogs');
    const q = query(logsRef, orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        date: toDate(data.date)!
      } as DailyLog;
    });
  } catch (error) {
    console.error("Error getting all daily logs:", error);
    return [];
  }
};
