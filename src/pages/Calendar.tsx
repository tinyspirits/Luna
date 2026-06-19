import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { getAllCycles } from '../services/firestore';
import type { Cycle } from '../services/firestore';
import { getGlobalPregnancyChance } from '../utils/cycleCalculations';
import { useAuth } from '../contexts/AuthContext';

const CalendarPage = () => {
  const { viewingUid, usePartnerData, setUsePartnerData, profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [cycles, setCycles] = useState<Cycle[]>([]);

  useEffect(() => {
    const fetchCycle = async () => {
      if (!viewingUid) return;
      const data = await getAllCycles(viewingUid);
      setCycles(data);
    };
    fetchCycle();
  }, [viewingUid]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="animate-fade-in">
      {profile?.partnerUid && profile?.gender !== 'male' && profile?.partnerGender !== 'male' && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'var(--surface)', padding: '4px', borderRadius: '8px' }}>
          <button style={{ flex: 1, padding: '8px', borderRadius: '6px', background: !usePartnerData ? 'var(--primary)' : 'transparent', color: !usePartnerData ? 'white' : 'var(--text-main)', fontWeight: !usePartnerData ? 'bold' : 'normal' }} onClick={() => setUsePartnerData(false)}>Của mình</button>
          <button style={{ flex: 1, padding: '8px', borderRadius: '6px', background: usePartnerData ? 'var(--secondary)' : 'transparent', color: usePartnerData ? 'var(--text-main)' : 'var(--text-main)', fontWeight: usePartnerData ? 'bold' : 'normal' }} onClick={() => setUsePartnerData(true)}>Của {profile?.partnerName || 'bạn đời'}</button>
        </div>
      )}

      <h1>Lịch {usePartnerData && `(${profile?.partnerName || 'Bạn đời'})`}</h1>
      
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
          
          {days.map(day => {
            let chance = 'Chưa rõ';

            if (cycles.length > 0) {
              chance = getGlobalPregnancyChance(day, cycles);
            }

            const isPeriod = chance === 'Đang Hành Kinh';
            const isOvulation = chance === 'Trứng rụng';
            const isFertile = chance === 'Cao';
            const isSafe = chance === 'An toàn';

            return (
              <div 
                key={day.toString()} 
                className={`calendar-cell ${!isSameMonth(day, monthStart) ? 'disabled' : ''} ${isSameDay(day, new Date()) ? 'today' : ''} ${isPeriod ? 'period' : ''} ${isOvulation ? 'ovulation' : ''} ${isFertile ? 'fertile' : ''} ${isSafe ? 'safe' : ''}`}
                style={{ position: 'relative', padding: '10px 0' }}
              >
                {format(day, 'd')}
                {isPeriod && <span style={{ position: 'absolute', bottom: '2px', right: '2px', fontSize: '0.7rem' }}>{profile?.periodIcon || '🩸'}</span>}
              </div>
            );
          })}
        </div>
        
        <div style={{ marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--primary)' }}></div> Ngày có kinh / Hành kinh
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--secondary)', boxShadow: '0 0 5px var(--secondary)' }}></div> Ngày rụng trứng (Tỉ lệ mang thai ĐỈNH ĐIỂM)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(248, 165, 194, 0.5)', border: '1px dashed var(--secondary)' }}></div> Cửa sổ thụ thai (Tỉ lệ mang thai CAO)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(46, 204, 113, 0.4)' }}></div> Ngày an toàn (Tỉ lệ mang thai THẤP)
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
