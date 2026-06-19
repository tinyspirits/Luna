import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DailyLog } from '../services/firestore';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  logs: DailyLog[];
}

const LogCalendar = ({ value, onChange, logs }: Props) => {
  const [currentMonth, setCurrentMonth] = useState(parseISO(value) || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const selectedDate = parseISO(value);

  const hasLog = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return logs.some(log => {
      const logDateStr = format(log.date, 'yyyy-MM-dd');
      return logDateStr === dayStr && (log.bleeding || log.symptoms?.length > 0 || log.mood?.length > 0 || log.notes || (log as any).discharge);
    });
  };

  return (
    <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)' }}>
      {/* Header chuyển tháng */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={{ padding: '8px', borderRadius: '50%', background: 'var(--background)', display: 'flex', alignItems: 'center' }}>
          <ChevronLeft size={18} />
        </button>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>{format(currentMonth, 'MM/yyyy')}</h3>
        <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} style={{ padding: '8px', borderRadius: '50%', background: 'var(--background)', display: 'flex', alignItems: 'center' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Tiêu đề ngày trong tuần */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px', textAlign: 'center' }}>
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
          <div key={d} style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>{d}</div>
        ))}
      </div>

      {/* Lưới ngày */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {days.map(day => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const inMonth = isSameMonth(day, monthStart);
          const logged = hasLog(day);

          return (
            <button
              type="button"
              key={day.toString()}
              onClick={() => onChange(format(day, 'yyyy-MM-dd'))}
              style={{
                position: 'relative',
                padding: '10px 0', borderRadius: '50%',
                background: isSelected ? 'var(--primary)' : 'transparent',
                color: isSelected ? '#fff' : inMonth ? 'var(--text-main)' : 'var(--text-muted)',
                border: isToday && !isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                opacity: inMonth ? 1 : 0.3,
                fontWeight: isSelected ? 'bold' : 'normal',
                fontSize: '0.9rem', cursor: 'pointer',
                boxShadow: isSelected ? '0 2px 8px rgba(155,89,182,0.4)' : 'none',
              }}
            >
              {format(day, 'd')}
              {logged && !isSelected && (
                <div style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)' }}></div>
              )}
              {logged && isSelected && (
                <div style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: 'white' }}></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LogCalendar;
