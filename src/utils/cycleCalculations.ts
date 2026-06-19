import { addDays, subDays, differenceInDays } from 'date-fns';

export interface UserSettings {
  averageCycleLength: number; // e.g. 28
  averagePeriodLength: number; // e.g. 5
}

export const calculatePredictions = (
  lastPeriodStartDate: Date,
  settings: UserSettings
) => {
  // Next period start = Last period start + average cycle length
  const nextPeriodStart = addDays(lastPeriodStartDate, settings.averageCycleLength);
  
  // Ovulation = Usually 14 days before next period
  const ovulationDate = subDays(nextPeriodStart, 14);
  
  // Fertile window = 5 days before ovulation + ovulation day
  const fertileWindowStart = subDays(ovulationDate, 5);
  const fertileWindowEnd = ovulationDate;

  return {
    nextPeriodStart,
    ovulationDate,
    fertileWindowStart,
    fertileWindowEnd,
  };
};

export const getCycleDay = (lastPeriodStartDate: Date, currentDate: Date) => {
  return differenceInDays(currentDate, lastPeriodStartDate) + 1;
};
