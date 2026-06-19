import { useEffect, useState } from 'react';
import { getLatestCycle, startNewCycle } from '../services/firestore';
import type { Cycle } from '../services/firestore';
import { getCycleDay } from '../utils/cycleCalculations';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { currentUser } = useAuth();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCycle = async () => {
      if (!currentUser) return;
      const data = await getLatestCycle(currentUser.uid);
      setCycle(data);
      setLoading(false);
    };
    fetchCycle();
  }, [currentUser]);

  const handleStartPeriod = async () => {
    if (!currentUser) return;
    setLoading(true);
    // In real app, prompt for date. Here we use today.
    await startNewCycle(currentUser.uid, new Date(), { averageCycleLength: 28, averagePeriodLength: 5 });
    const data = await getLatestCycle(currentUser.uid);
    setCycle(data);
    setLoading(false);
  };

  if (loading) {
    return <div className="animate-fade-in"><p>Đang tải dữ liệu của bạn...</p></div>;
  }

  const cycleDay = cycle ? getCycleDay(cycle.startDate, new Date()) : 0;

  return (
    <div className="animate-fade-in">
      <h1>Chào buổi sáng 👋</h1>
      <p style={{ marginBottom: '24px' }}>Hôm nay cơ thể bạn cảm thấy thế nào?</p>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
        {/* Simple Cycle Wheel CSS Implementation */}
        <div style={{
          width: '250px',
          height: '250px',
          borderRadius: '50%',
          background: cycle ? 'var(--surface)' : 'var(--border)',
          border: '10px solid var(--primary-light)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-md)'
        }}>
          {cycle ? (
            <>
              <h2 style={{ fontSize: '3rem', margin: 0, color: 'var(--primary)' }}>{cycleDay}</h2>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Ngày của chu kỳ</span>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h3 style={{ color: 'var(--text-muted)' }}>Chưa có dữ liệu</h3>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Thao tác nhanh</h2>
        {!cycle ? (
          <button className="btn-primary" onClick={handleStartPeriod}>
            Bắt đầu chu kỳ hôm nay
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p><strong>Kỳ kinh tiếp theo:</strong> {cycle.expectedNextPeriod.toLocaleDateString()}</p>
            <p><strong>Ngày rụng trứng:</strong> {cycle.expectedOvulation.toLocaleDateString()}</p>
            <button className="btn-secondary" style={{ width: '100%', marginTop: '10px' }} onClick={handleStartPeriod}>
              Bắt đầu chu kỳ mới
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Thông tin hôm nay</h2>
        <p>Bạn đang ở trong giai đoạn nang noãn. Bạn có thể cảm thấy tràn đầy năng lượng hơn. Đây là thời điểm tuyệt vời để tập thể dục!</p>
      </div>
    </div>
  );
};

export default Home;
