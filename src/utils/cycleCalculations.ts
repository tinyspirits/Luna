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
  const fertileWindowEnd = addDays(ovulationDate, 1);
  return { nextPeriodStart, ovulationDate, fertileWindowStart, fertileWindowEnd };
};

export const getCycleDay = (lastPeriodStartDate: Date, currentDate: Date) => {
  return differenceInDays(currentDate, lastPeriodStartDate) + 1;
};

export const getGlobalCycleDay = (currentDate: Date, cycles: Cycle[]): number => {
  if (cycles.length === 0) return 0;
  
  const sorted = [...cycles].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  let latestStart = sorted[sorted.length - 1].startDate;
  
  if (currentDate < latestStart) {
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (currentDate >= sorted[i].startDate) {
        return differenceInDays(currentDate, sorted[i].startDate) + 1;
      }
    }
    return differenceInDays(currentDate, sorted[0].startDate) + 1;
  }
  
  const future = predictFutureCycles(cycles, 12);
  for (let i = future.length - 1; i >= 0; i--) {
    if (currentDate >= future[i].start) {
      latestStart = future[i].start;
      break;
    }
  }
  
  return differenceInDays(currentDate, latestStart) + 1;
};

export type PregnancyChance = 'Trứng rụng' | 'Cao' | 'Thấp' | 'An toàn' | 'Đang Hành Kinh' | 'Dự đoán hành kinh' | 'Chưa rõ';

export const predictFutureCycles = (cycles: Cycle[], count: number = 6) => {
  if (cycles.length === 0) return [];
  const pred = calculateSmartPredictions(cycles);
  const avgLen = pred.averageCycleLength;
  const avgPeriod = 5;
  const sorted = [...cycles].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  const lastStart = sorted[sorted.length - 1].startDate;
  const future: { start: Date; end: Date; ovulation: Date }[] = [];
  for (let i = 1; i <= count; i++) {
    const start = addDays(lastStart, avgLen * i);
    future.push({
      start,
      end: addDays(start, avgPeriod - 1),
      ovulation: addDays(start, avgLen - 14),
    });
  }
  return future;
};

export const getGlobalPregnancyChance = (currentDate: Date, cycles: Cycle[]): PregnancyChance => {
  if (cycles.length === 0) return 'Chưa rõ';
  
  // Check historical/current cycles
  for (const c of cycles) {
    const isBleeding = isWithinInterval(currentDate, {
      start: c.startDate,
      end: addDays(c.startDate, 4) // assume 5 days
    });
    if (isBleeding) return 'Đang Hành Kinh';

    const isOvulation = isSameDay(currentDate, c.expectedOvulation);
    if (isOvulation) return 'Trứng rụng';

    const isFertile = isWithinInterval(currentDate, {
      start: subDays(c.expectedOvulation, 5),
      end: addDays(c.expectedOvulation, 1)
    });
    if (isFertile) return 'Cao';
  }

  // Check future predicted cycles
  const future = predictFutureCycles(cycles, 12);
  for (const f of future) {
    const isBleeding = isWithinInterval(currentDate, {
      start: f.start,
      end: f.end
    });
    if (isBleeding) return 'Dự đoán hành kinh';

    const isOvulation = isSameDay(currentDate, f.ovulation);
    if (isOvulation) return 'Trứng rụng';

    const isFertile = isWithinInterval(currentDate, {
      start: subDays(f.ovulation, 5),
      end: addDays(f.ovulation, 1)
    });
    if (isFertile) return 'Cao';

    const isLow = isWithinInterval(currentDate, {
      start: subDays(f.ovulation, 8),
      end: subDays(f.ovulation, 6)
    }) || isWithinInterval(currentDate, {
      start: addDays(f.ovulation, 2),
      end: addDays(f.ovulation, 3)
    });
    if (isLow) return 'Thấp';
  }

  return 'An toàn';
};
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

  const isLow = isWithinInterval(currentDate, {
    start: subDays(cycle.expectedOvulation, 8),
    end: subDays(cycle.expectedOvulation, 6)
  }) || isWithinInterval(currentDate, {
    start: addDays(cycle.expectedOvulation, 2),
    end: addDays(cycle.expectedOvulation, 3)
  });
  if (isLow) return 'Thấp';

  return 'An toàn';
};
