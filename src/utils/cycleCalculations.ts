import { addDays, subDays, differenceInDays, isWithinInterval, isSameDay } from 'date-fns';
import type { Cycle } from '../services/firestore';

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

export type PregnancyChance = 'Trứng rụng' | 'Cao' | 'Thấp' | 'Đang Hành Kinh' | 'Chưa rõ';

export const getPregnancyChance = (currentDate: Date, cycle: Cycle): PregnancyChance => {
  const isBleeding = isWithinInterval(currentDate, { 
    start: cycle.expectedNextPeriod, 
    end: addDays(cycle.expectedNextPeriod, 4) 
  }) || isWithinInterval(currentDate, {
    start: cycle.startDate,
    end: addDays(cycle.startDate, 4)
  });

  if (isBleeding) return 'Đang Hành Kinh';

  const isOvulation = isSameDay(currentDate, cycle.expectedOvulation);
  if (isOvulation) return 'Trứng rụng';

  // Fertile window (cửa sổ thụ thai) = 5 days before ovulation + 1 day after
  const isFertile = isWithinInterval(currentDate, {
    start: subDays(cycle.expectedOvulation, 5),
    end: addDays(cycle.expectedOvulation, 1)
  });

  if (isFertile) return 'Cao';

  // Nếu không thuộc các trường hợp trên, đây là ngày an toàn
  return 'Thấp';
};
