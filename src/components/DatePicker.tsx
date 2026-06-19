import { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

const DatePicker = ({ value, onChange }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(parseISO(value) || new Date());
  const popupRef = useRef<HTMLDivElement>(null);

  // Đóng lịch khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const selectedDate = parseISO(value);

  const handleSelect = (day: Date) => {
    onChange(format(day, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }} ref={popupRef}>
      {/* Nút bấm hiển thị ngày */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: '8px', 
          border: '1px solid var(--border)', background: 'var(--background)', 
          color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', fontSize: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {format(selectedDate, 'dd/MM/yyyy')}
        <CalendarIcon size={20} color="var(--text-muted)" />
      </button>

      {/* Popup Lịch dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '16px', zIndex: 100,
          boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
          {/* Header chuyển tháng */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} style={{ padding: '8px', borderRadius: '50%', background: 'var(--background)', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={18} />
            </button>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>{format(currentMonth, 'MMMM yyyy')}</h3>
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

              return (
                <button
                  type="button"
                  key={day.toString()}
                  onClick={() => handleSelect(day)}
                  style={{
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
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
