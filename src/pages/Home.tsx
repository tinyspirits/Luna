import { useEffect, useState } from 'react';
import { getLatestCycle, startNewCycle, addHistoricalCycle } from '../services/firestore';
import type { Cycle } from '../services/firestore';
import { getCycleDay } from '../utils/cycleCalculations';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { currentUser, profile, viewingUid, usePartnerData, setUsePartnerData } = useAuth();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [histStart, setHistStart] = useState('');
  const [histEnd, setHistEnd] = useState('');

  useEffect(() => {
    const fetchCycle = async () => {
      if (!viewingUid) return;
      setLoading(true);
      const data = await getLatestCycle(viewingUid);
      setCycle(data);
      setLoading(false);
    };
    fetchCycle();
  }, [viewingUid]);

  const handleStartPeriod = async () => {
    if (!currentUser) return;
    setLoading(true);
    await startNewCycle(currentUser.uid, new Date(), { averageCycleLength: 28, averagePeriodLength: 5 });
    const data = await getLatestCycle(currentUser.uid);
    setCycle(data);
    setLoading(false);
  };

  const handleAddHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !histStart || !histEnd) return;
    setLoading(true);
    await addHistoricalCycle(currentUser.uid, new Date(histStart), new Date(histEnd), { averageCycleLength: 28, averagePeriodLength: 5 });
    const data = await getLatestCycle(currentUser.uid);
    setCycle(data);
    setShowHistoryForm(false);
    setLoading(false);
    alert('Đã thêm chu kỳ cũ thành công!');
  };

  if (loading) {
    return <div className="animate-fade-in"><p>Đang tải dữ liệu của bạn...</p></div>;
  }

  const cycleDay = cycle ? getCycleDay(cycle.startDate, new Date()) : 0;

  return (
    <div className="animate-fade-in">
      {profile?.partnerUid && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'var(--surface)', padding: '4px', borderRadius: '8px' }}>
          <button style={{ flex: 1, padding: '8px', borderRadius: '6px', background: !usePartnerData ? 'var(--primary)' : 'transparent', color: !usePartnerData ? 'white' : 'var(--text-main)', fontWeight: !usePartnerData ? 'bold' : 'normal' }} onClick={() => setUsePartnerData(false)}>Của mình</button>
          <button style={{ flex: 1, padding: '8px', borderRadius: '6px', background: usePartnerData ? 'var(--secondary)' : 'transparent', color: usePartnerData ? 'var(--text-main)' : 'var(--text-main)', fontWeight: usePartnerData ? 'bold' : 'normal' }} onClick={() => setUsePartnerData(true)}>Của {profile?.partnerName || 'bạn đời'}</button>
        </div>
      )}

      <h1>{usePartnerData ? `Chu kỳ của ${profile?.partnerName || 'bạn đời'} 👋` : 'Chào buổi sáng 👋'}</h1>
      <p style={{ marginBottom: '24px' }}>Hôm nay cơ thể {usePartnerData ? (profile?.partnerName || 'người ấy') : 'bạn'} cảm thấy thế nào?</p>

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
        {usePartnerData ? (
          <p>Bạn đang ở chế độ xem. Không thể chỉnh sửa dữ liệu của bạn đời.</p>
        ) : (
          <>
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
            
            <button className="btn-secondary" style={{ width: '100%', marginTop: '10px', background: 'transparent', border: '1px solid var(--border)' }} onClick={() => setShowHistoryForm(!showHistoryForm)}>
              {showHistoryForm ? 'Đóng' : 'Nhập chu kỳ cũ (Lịch sử)'}
            </button>

            {showHistoryForm && (
              <form onSubmit={handleAddHistory} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: 'var(--background)', borderRadius: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Ngày bắt đầu</label>
                  <input type="date" required value={histStart} onChange={e => setHistStart(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Ngày kết thúc</label>
                  <input type="date" required value={histEnd} onChange={e => setHistEnd(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }} />
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '8px' }}>Lưu chu kỳ cũ</button>
              </form>
            )}
          </>
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
