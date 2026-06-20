import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths,
  addDays, isWithinInterval
} from 'date-fns';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Cycle } from '../services/firestore';
import { calculateSmartPredictions } from '../utils/cycleCalculations';

interface Props {
  onSave: (cycles: { startDate: Date; endDate: Date }[]) => void;
  onClose: () => void;
  existingCycles: Cycle[];
}

// Predict future cycles
const predictFutureCycles = (cycles: Cycle[], count: number = 6) => {
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

const CycleCalendarModal = ({ onSave, onClose, existingCycles }: Props) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  const [mode, setMode] = useState<'period' | 'start'>('period');

  const futurePredictions = existingCycles.length >= 1 ? predictFutureCycles(existingCycles) : [];

  const getExistingStatus = (day: Date): 'period' | 'start' | 'predicted-period' | 'predicted-ovulation' | null => {
    for (const c of existingCycles) {
      if (isSameDay(day, c.startDate)) return 'start';
      // Chỉ bôi đỏ tối đa 5 ngày hành kinh để tránh lỗi data cũ
      const periodEnd = addDays(c.startDate, 4);
      if (isWithinInterval(day, { start: c.startDate, end: periodEnd })) return 'period';
    }
    for (const f of futurePredictions) {
      if (isSameDay(day, f.ovulation)) return 'predicted-ovulation';
      if (isWithinInterval(day, { start: f.start, end: f.end })) return 'predicted-period';
    }
    return null;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const toggleDay = (day: Date) => {
    const alreadySelected = selectedDays.some(d => isSameDay(d, day));
    if (alreadySelected) {
      setSelectedDays(selectedDays.filter(d => !isSameDay(d, day)));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const isSelected = (day: Date) => selectedDays.some(d => isSameDay(d, day));

  const handleSave = () => {
    if (selectedDays.length === 0) return;
    const sorted = [...selectedDays].sort((a, b) => a.getTime() - b.getTime());

    if (mode === 'period') {
      // All selected days = 1 cycle (period days)
      onSave([{ startDate: sorted[0], endDate: sorted[sorted.length - 1] }]);
    } else {
      // Each selected day = start of a separate cycle
      // endDate = day before next cycle start
      const cycles: { startDate: Date; endDate: Date }[] = [];
      for (let i = 0; i < sorted.length; i++) {
        const start = sorted[i];
        const end = addDays(start, 4); // Mặc định 5 ngày hành kinh
        cycles.push({ startDate: start, endDate: end });
      }
      onSave(cycles);
    }
  };

  const getDayStyle = (day: Date, inMonth: boolean) => {
    const selected = isSelected(day);
    const isToday = isSameDay(day, new Date());
    const status = getExistingStatus(day);

    let background = 'transparent';
    let color = inMonth ? 'var(--text-main)' : 'var(--text-muted)';
    let border = 'none';
    let fontWeight = 'normal';
    let boxShadow = 'none';
    let opacity = inMonth ? 1 : 0.3;

    if (selected) {
      background = 'var(--primary)';
      color = '#fff';
      fontWeight = 'bold';
      boxShadow = '0 2px 8px rgba(155,89,182,0.4)';
    } else if (status === 'start') {
      background = '#e84393';
      color = '#fff';
      fontWeight = 'bold';
      boxShadow = '0 2px 6px rgba(232,67,147,0.4)';
    } else if (status === 'period') {
      background = 'rgba(232,67,147,0.25)';
      color = '#e84393';
      fontWeight = '600';
    } else if (status === 'predicted-period') {
      background = 'rgba(155,89,182,0.15)';
      color = 'var(--primary)';
      border = '1px dashed var(--primary)';
    } else if (status === 'predicted-ovulation') {
      background = 'var(--secondary)';
      color = '#333';
      fontWeight = 'bold';
      boxShadow = '0 0 6px var(--secondary)';
    }

    if (isToday && !selected) {
      border = '2px solid var(--primary)';
    }

    return {
      aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '50%', cursor: inMonth ? 'pointer' : 'default',
      background, color, border, fontWeight, boxShadow, opacity,
      fontSize: '0.9rem', transition: 'all 0.15s',
    };
  };

  const legends = [
    { color: '#e84393', label: 'Ngày bắt đầu kinh' },
    { color: 'rgba(232,67,147,0.25)', label: 'Ngày hành kinh', border: '' },
    { color: 'rgba(155,89,182,0.15)', label: 'Dự đoán kinh', border: '1px dashed var(--primary)' },
    { color: 'var(--secondary)', label: 'Dự đoán rụng trứng' },
    { color: 'var(--primary)', label: 'Đang chọn' },
  ];

  // Build summary for "start" mode
  const buildSummary = () => {
    if (selectedDays.length === 0) return null;
    const sorted = [...selectedDays].sort((a, b) => a.getTime() - b.getTime());

    if (mode === 'period') {
      return (
        <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
          <strong>{"Đã chọn " + sorted.length + " ngày hành kinh:"}</strong><br/>
          <span style={{ color: 'var(--text-muted)' }}>
            {format(sorted[0], 'dd/MM/yyyy')} {" -> "} {format(sorted[sorted.length - 1], 'dd/MM/yyyy')}
          </span>
        </div>
      );
    } else {
      return (
        <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
          <strong>{sorted.length + " chu kỳ sẽ được tạo:"}</strong>
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {sorted.map((d, i) => {
              const end = addDays(d, 4);
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                  <span>{format(d, 'dd/MM/yyyy')}</span>
                  <span>{" -> " + format(end, 'dd/MM/yyyy')} (5 ngày kinh)</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: '480px',
        background: 'var(--surface)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '24px 24px 0 0',
        padding: '24px 24px 100px 24px',
        maxHeight: '92vh',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Nhập chu kỳ cũ</h2>
          <button onClick={onClose} style={{ background: 'var(--border)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Radio select mode */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <label style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
            border: `2px solid ${mode === 'period' ? 'var(--primary)' : 'var(--border)'}`,
            background: mode === 'period' ? 'var(--primary-light)' : 'var(--surface)',
            transition: 'all 0.2s',
          }}>
            <input type="radio" name="mode" value="period" checked={mode === 'period'} onChange={() => setMode('period')} style={{ accentColor: 'var(--primary)' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Ngày hành kinh</span>
          </label>
          <label style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
            border: `2px solid ${mode === 'start' ? 'var(--primary)' : 'var(--border)'}`,
            background: mode === 'start' ? 'var(--primary-light)' : 'var(--surface)',
            transition: 'all 0.2s',
          }}>
            <input type="radio" name="mode" value="start" checked={mode === 'start'} onChange={() => setMode('start')} style={{ accentColor: 'var(--primary)' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Bắt đầu chu kỳ</span>
          </label>
        </div>

        {/* Instruction */}
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', textAlign: 'center' }}>
          {mode === 'period'
            ? 'Chọn tất cả các ngày bạn có kinh trong tháng này'
            : 'Chọn các ngày bắt đầu kinh ở mỗi tháng (mỗi ngày = 1 chu kỳ)'
          }
        </p>

        {/* Month navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={{ background: 'var(--surface)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={18} />
          </button>
          <h3 style={{ margin: 0 }}>{format(currentMonth, "MMMM yyyy")}</h3>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={{ background: 'var(--surface)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px', textAlign: 'center' }}>
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
            <div key={d} style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '16px' }}>
          {days.map(day => {
            const inMonth = isSameMonth(day, monthStart);
            return (
              <button
                key={day.toString()}
                onClick={() => inMonth && toggleDay(day)}
                style={getDayStyle(day, inMonth) as any}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {legends.map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: l.color, border: l.border || 'none', flexShrink: 0 }} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Selected summary */}
        {buildSummary()}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Hủy</button>
          <button onClick={handleSave} className="btn-primary" style={{ flex: 1 }} disabled={selectedDays.length === 0}>Lưu chu kỳ</button>
        </div>
      </div>
    </div>
  );
};

export default CycleCalendarModal;
