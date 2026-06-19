import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { getLatestCycle } from '../services/firestore';
import type { Cycle } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';

const CalendarPage = () => {
  const { viewingUid, usePartnerData } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [cycle, setCycle] = useState<Cycle | null>(null);

  useEffect(() => {
    const fetchCycle = async () => {
      if (!viewingUid) return;
      const data = await getLatestCycle(viewingUid);
      setCycle(data);
    };
    fetchCycle();
  }, [viewingUid]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = monthStart; // For a real calendar, you'd pad the start day to match the week start
  const endDate = monthEnd; // Similarly, pad the end day

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const getDayStatus = (day: Date) => {
    if (!cycle) return null;
    
    // Simplistic logic for demo:
    // Red if same day as start date
    if (isSameDay(day, cycle.startDate)) return 'period-start';
    if (isSameDay(day, cycle.expectedNextPeriod)) return 'period-next';
    if (isSameDay(day, cycle.expectedOvulation)) return 'ovulation';
    
    return null;
  };

  return (
    <div className="animate-fade-in">
      <h1>Lịch {usePartnerData && '(Bạn đời)'}</h1>
      
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button className="btn-secondary" onClick={prevMonth}>&lt;</button>
          <h2 style={{ margin: 0 }}>{format(currentDate, dateFormat)}</h2>
          <button className="btn-secondary" onClick={nextMonth}>&gt;</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
            <div key={d} style={{ fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{d}</div>
          ))}
          
          {/* Pad empty days for first week (simplistic) */}
          {Array.from({ length: startDate.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {days.map(day => {
            const status = getDayStatus(day);
            let bgColor = 'transparent';
            let color = 'var(--text-main)';
            
            if (status === 'period-start') {
              bgColor = 'var(--primary)';
              color = 'white';
            } else if (status === 'period-next') {
              bgColor = 'var(--primary-light)';
              color = 'white';
            } else if (status === 'ovulation') {
              bgColor = 'var(--secondary)';
              color = 'var(--text-main)';
            }

            return (
              <div 
                key={day.toString()} 
                style={{ 
                  padding: '10px 0', 
                  borderRadius: '50%', 
                  background: bgColor,
                  color: color,
                  fontWeight: isSameDay(day, new Date()) ? 'bold' : 'normal',
                  border: isSameDay(day, new Date()) ? '2px solid var(--text-main)' : 'none'
                }}
              >
                {format(day, 'd')}
              </div>
            );
          })}
        </div>
        
        <div style={{ marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--primary)' }}></div> Ngày có kinh (Bắt đầu)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--primary-light)' }}></div> Ngày có kinh dự kiến
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--secondary)' }}></div> Ngày rụng trứng dự kiến
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
