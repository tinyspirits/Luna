import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths
} from 'date-fns';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  onSave: (startDate: Date, endDate: Date) => void;
  onClose: () => void;
}

const CycleCalendarModal = ({ onSave, onClose }: Props) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  const [mode, setMode] = useState<'period' | 'start'>('period');

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
    const start = sorted[0];
    const end = sorted[sorted.length - 1];
    onSave(start, end);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: '480px',
        background: 'var(--background)',
        borderRadius: '24px 24px 0 0',
        padding: '24px',
        maxHeight: '90vh',
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
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>🩸 Ngày hành kinh</span>
          </label>
          <label style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
            border: `2px solid ${mode === 'start' ? 'var(--primary)' : 'var(--border)'}`,
            background: mode === 'start' ? 'var(--primary-light)' : 'var(--surface)',
            transition: 'all 0.2s',
          }}>
            <input type="radio" name="mode" value="start" checked={mode === 'start'} onChange={() => setMode('start')} style={{ accentColor: 'var(--primary)' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>📅 Bắt đầu chu kỳ</span>
          </label>
        </div>

        {/* Instruction */}
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', textAlign: 'center' }}>
          {mode === 'period'
            ? 'Chọn tất cả các ngày bạn có kinh trong tháng này'
            : 'Chọn ngày đầu tiên của chu kỳ (ngày bắt đầu kinh)'
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '24px' }}>
          {days.map(day => {
            const selected = isSelected(day);
            const inMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            return (
              <button
                key={day.toString()}
                onClick={() => inMonth && toggleDay(day)}
                style={{
                  padding: '10px 0',
                  borderRadius: '50%',
                  border: isToday && !selected ? '2px solid var(--primary)' : 'none',
                  background: selected ? 'var(--primary)' : 'transparent',
                  color: selected ? '#fff' : inMonth ? 'var(--text-main)' : 'var(--text-muted)',
                  opacity: inMonth ? 1 : 0.3,
                  cursor: inMonth ? 'pointer' : 'default',
                  fontWeight: selected ? 'bold' : 'normal',
                  fontSize: '0.9rem',
                  transition: 'all 0.15s',
                  boxShadow: selected ? '0 2px 8px rgba(155,89,182,0.4)' : 'none',
                }}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        {/* Selected summary */}
        {selectedDays.length > 0 && (
          <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
            <strong>Đã chọn {selectedDays.length} ngày:</strong>
            <br />
            <span style={{ color: 'var(--text-muted)' }}>
              {format([...selectedDays].sort((a,b)=>a.getTime()-b.getTime())[0], 'dd/MM/yyyy')}
              {selectedDays.length > 1 && ` → ${format([...selectedDays].sort((a,b)=>a.getTime()-b.getTime())[selectedDays.length - 1], 'dd/MM/yyyy')}`}
            </span>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ flex: 1 }}
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            style={{ flex: 1 }}
            disabled={selectedDays.length === 0}
          >
            💾 Lưu chu kỳ
          </button>
        </div>
      </div>
    </div>
  );
};

export default CycleCalendarModal;
