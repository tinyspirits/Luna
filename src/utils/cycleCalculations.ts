import { addDays, subDays, differenceInDays, isWithinInterval, isSameDay } from 'date-fns';
import type { Cycle } from '../services/firestore';

export interface UserSettings {
  averageCycleLength: number; // e.g. 28
  averagePeriodLength: number; // e.g. 5
}

export interface SmartPrediction {
  nextPeriodStart: Date;
  ovulationDate: Date;
  fertileWindowStart: Date;
  fertileWindowEnd: Date;
  averageCycleLength: number;
  isIrregular: boolean;
  confidence: 'high' | 'medium' | 'low';
  daysUntilNextPeriod: number;
}

/**
 * Thuật toán thông minh kiểu Flo: Tự tính chu kỳ trung bình từ lịch sử thực tế.
 * Càng nhiều dữ liệu → càng chính xác.
 */
export const calculateSmartPredictions = (
  cycleHistory: Cycle[],
  fallbackSettings: UserSettings = { averageCycleLength: 28, averagePeriodLength: 5 }
): SmartPrediction => {
  const today = new Date();

  // Sắp xếp lịch sử theo thời gian tăng dần
  const sorted = [...cycleHistory].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );

  let avgCycleLength = fallbackSettings.averageCycleLength;
  let isIrregular = false;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  if (sorted.length >= 2) {
    // Tính độ dài thực tế của từng chu kỳ
    const cycleLengths: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const len = differenceInDays(sorted[i].startDate, sorted[i - 1].startDate);
      if (len > 15 && len < 60) cycleLengths.push(len); // loại bỏ giá trị bất thường
    }

    if (cycleLengths.length > 0) {
      avgCycleLength = Math.round(
        cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length
      );

      // Kiểm tra độ đều: độ lệch chuẩn > 7 ngày → không đều
      const mean = avgCycleLength;
      const variance =
        cycleLengths.reduce((acc, l) => acc + Math.pow(l - mean, 2), 0) / cycleLengths.length;
      const stdDev = Math.sqrt(variance);
      isIrregular = stdDev > 7;

      // Độ tin cậy dựa vào số chu kỳ đã ghi
      if (cycleLengths.length >= 6) confidence = 'high';
      else if (cycleLengths.length >= 3) confidence = 'medium';
      else confidence = 'low';
    }
  }

  const lastCycle = sorted[sorted.length - 1];
  const baseDate = lastCycle ? lastCycle.startDate : today;

  const nextPeriodStart = addDays(baseDate, avgCycleLength);
  const ovulationDate = subDays(nextPeriodStart, 14);
  const fertileWindowStart = subDays(ovulationDate, 5);
  const fertileWindowEnd = addDays(ovulationDate, 1);
  const daysUntilNextPeriod = differenceInDays(nextPeriodStart, today);

  return {
    nextPeriodStart,
    ovulationDate,
    fertileWindowStart,
    fertileWindowEnd,
    averageCycleLength: avgCycleLength,
    isIrregular,
    confidence,
    daysUntilNextPeriod,
  };
};

// Legacy function kept for backward compat
export const calculatePredictions = (
  lastPeriodStartDate: Date,
  settings: UserSettings
) => {
  const nextPeriodStart = addDays(lastPeriodStartDate, settings.averageCycleLength);
  const ovulationDate = subDays(nextPeriodStart, 14);
  const fertileWindowStart = subDays(ovulationDate, 5);
  const fertileWindowEnd = ovulationDate;
  return { nextPeriodStart, ovulationDate, fertileWindowStart, fertileWindowEnd };
};

export const getCycleDay = (lastPeriodStartDate: Date, currentDate: Date) => {
  return differenceInDays(currentDate, lastPeriodStartDate) + 1;
};

export type PregnancyChance = 'Trứng rụng' | 'Cao' | 'An toàn' | 'Đang Hành Kinh' | 'Chưa rõ';

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

  const isFertile = isWithinInterval(currentDate, {
    start: subDays(cycle.expectedOvulation, 5),
    end: addDays(cycle.expectedOvulation, 1)
  });
  if (isFertile) return 'Cao';

  return 'An toàn';
};
