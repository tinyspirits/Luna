import { useEffect, useState } from 'react';
import { getLatestCycle, startNewCycle, addHistoricalCycle, getAllCycles } from '../services/firestore';
import type { Cycle } from '../services/firestore';
import { getCycleDay, getPregnancyChance, calculateSmartPredictions } from '../utils/cycleCalculations';
import { differenceInDays } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import CycleCalendarModal from '../components/CycleCalendarModal';

const Home = () => {
  const { currentUser, profile, viewingUid, usePartnerData, setUsePartnerData } = useAuth();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [allCycles, setAllCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    const fetchCycle = async () => {
      if (!viewingUid) return;
      setLoading(true);
      const [data, history] = await Promise.all([
        getLatestCycle(viewingUid),
        getAllCycles(viewingUid)
      ]);
      setCycle(data);
      setAllCycles(history);
      setLoading(false);
    };
    fetchCycle();
  }, [viewingUid]);

  const handleStartPeriod = async () => {
    if (!currentUser) return;
    setLoading(true);
    await startNewCycle(currentUser.uid, new Date(), { averageCycleLength: 28, averagePeriodLength: 5 });
    const [data, history] = await Promise.all([
      getLatestCycle(currentUser.uid),
      getAllCycles(currentUser.uid)
    ]);
    setCycle(data);
    setAllCycles(history);
    setLoading(false);
  };

  const handleAddHistory = async (cycles: { startDate: Date; endDate: Date }[]) => {
    if (!currentUser) return;
    setLoading(true);
    setShowHistoryModal(false);
    for (const c of cycles) {
      await addHistoricalCycle(currentUser.uid, c.startDate, c.endDate, { averageCycleLength: 28, averagePeriodLength: 5 });
    }
    const [data, history] = await Promise.all([
      getLatestCycle(currentUser.uid),
      getAllCycles(currentUser.uid)
    ]);
    setCycle(data);
    setAllCycles(history);
    setLoading(false);
    alert('Đã thêm chu kỳ cũ thành công!');
  };

  if (loading) {
    return <div className="animate-fade-in"><p>Đang tải dữ liệu của bạn...</p></div>;
  }

  const cycleDay = cycle ? getCycleDay(cycle.startDate, new Date()) : 0;
  const daysUntilStart = cycle ? differenceInDays(cycle.startDate, new Date()) : 0;
  const smartPred = allCycles.length > 0 ? calculateSmartPredictions(allCycles) : null;
  const daysUntilPeriod = smartPred?.daysUntilNextPeriod ?? (cycle ? Math.max(0, 28 - cycleDay) : null);

  const isMale = profile?.gender === 'male';

  // If male and not connected to a partner, show empty state immediately
  if (isMale && !profile?.partnerUid) {
    return (
      <div className="animate-fade-in">
        <h1>Chào buổi sáng 👋</h1>
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h2>Chưa kết nối bạn đời</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>
            Hãy vào phần <strong>Cài đặt</strong> và nhập mã của bạn đời để bắt đầu theo dõi chu kỳ của cô ấy nhé!
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="animate-fade-in">
      {profile?.partnerUid && profile?.gender !== 'male' && profile?.partnerGender === 'female' && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'var(--surface)', padding: '4px', borderRadius: '8px' }}>
          <button style={{ flex: 1, padding: '8px', borderRadius: '6px', background: !usePartnerData ? 'var(--primary)' : 'transparent', color: !usePartnerData ? 'white' : 'var(--text-main)', fontWeight: !usePartnerData ? 'bold' : 'normal' }} onClick={() => setUsePartnerData(false)}>Của mình</button>
          <button style={{ flex: 1, padding: '8px', borderRadius: '6px', background: usePartnerData ? 'var(--secondary)' : 'transparent', color: usePartnerData ? 'var(--text-main)' : 'var(--text-main)', fontWeight: usePartnerData ? 'bold' : 'normal' }} onClick={() => setUsePartnerData(true)}>Của {profile?.partnerName || 'bạn đời'}</button>
        </div>
      )}

      <h1>{isMale && profile?.partnerUid ? `Chu kỳ của ${profile?.partnerName || 'bạn đời'} 👋` : (usePartnerData ? `Chu kỳ của ${profile?.partnerName || 'bạn đời'} 👋` : 'Chào buổi sáng 👋')}</h1>
      <p style={{ marginBottom: '24px' }}>Hôm nay cơ thể {isMale || usePartnerData ? (profile?.partnerName || 'người ấy') : 'bạn'} cảm thấy thế nào?</p>

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
              <h2 style={{ fontSize: '3.5rem', margin: 0, color: 'var(--primary)', lineHeight: 1 }}>
                {daysUntilStart > 0 ? daysUntilStart : cycleDay}
              </h2>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500, marginTop: '8px' }}>
                {daysUntilStart > 0 ? 'Ngày nữa tới kỳ' : 'Ngày của chu kỳ'}
              </span>
              
              <div style={{ 
                marginTop: '12px',                    
                boxShadow: `0 0 30px ${getPregnancyChance(new Date(), cycle) === 'Trứng rụng' ? 'rgba(253, 203, 110, 0.4)' 
                          : getPregnancyChance(new Date(), cycle) === 'Cao' ? 'rgba(155, 89, 182, 0.3)' 
                          : getPregnancyChance(new Date(), cycle) === 'Thấp' ? 'rgba(52, 152, 219, 0.2)'
                          : getPregnancyChance(new Date(), cycle) === 'An toàn' ? 'rgba(46, 204, 113, 0.2)' 
                          : 'rgba(232, 67, 147, 0.2)'}`, 
                padding: '6px 14px', 
                borderRadius: '20px', 
                fontSize: '0.8rem', 
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                border: `2px solid ${getPregnancyChance(new Date(), cycle) === 'Trứng rụng' ? 'var(--secondary)' 
                      : getPregnancyChance(new Date(), cycle) === 'Cao' ? 'var(--primary)' 
                      : getPregnancyChance(new Date(), cycle) === 'Thấp' ? '#3498db'
                      : getPregnancyChance(new Date(), cycle) === 'An toàn' ? '#27ae60' 
                      : '#e84393'}`,
                color: getPregnancyChance(new Date(), cycle) === 'Trứng rụng' ? 'var(--text-main)'
                     : getPregnancyChance(new Date(), cycle) === 'Cao' ? 'var(--primary)' 
                     : getPregnancyChance(new Date(), cycle) === 'Thấp' ? '#3498db'
                     : getPregnancyChance(new Date(), cycle) === 'An toàn' ? '#27ae60' 
                     : '#e84393'
              }}>
                Thụ thai: {getPregnancyChance(new Date(), cycle) === 'Trứng rụng' ? 'Đỉnh điểm' : getPregnancyChance(new Date(), cycle)}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h3 style={{ color: 'var(--text-muted)' }}>Chưa có dữ liệu</h3>
            </div>
          )}
        </div>
      </div>

      {/* Countdown banner */}
      {cycle && daysUntilPeriod !== null && (
        <div style={{
          background: daysUntilPeriod <= 3 ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : 'var(--surface)',
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border)'
        }}>
          <span style={{ fontSize: '0.9rem', color: daysUntilPeriod <= 3 ? '#fff' : 'var(--text-muted)' }}>Kỳ kinh tiếp theo</span>
          <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: daysUntilPeriod <= 3 ? '#fff' : 'var(--primary)' }}>
            {daysUntilPeriod <= 0 ? 'Đã đến hạn!' : `Còn ${daysUntilPeriod} ngày`}
          </span>
        </div>
      )}

      <div className="card">
        <h2>Thao tác nhanh</h2>
        {usePartnerData ? (
          <p>Bạn đang ở chế độ xem. Không thể chỉnh sửa dữ liệu của bạn đời.</p>
        ) : (
          <>
            {!cycle ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>Bạn chưa có dữ liệu chu kỳ nào. Hãy bắt đầu!</p>
                <button className="btn-primary" onClick={handleStartPeriod}>
                  Bắt đầu chu kỳ hôm nay
                </button>
                <button className="btn-secondary" style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)' }} onClick={() => setShowHistoryModal(true)}>
                  📅 Nhập chu kỳ cũ (Lịch sử)
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p><strong>Kỳ kinh tiếp theo:</strong> {cycle.expectedNextPeriod.toLocaleDateString()}</p>
                <p><strong>Ngày rụng trứng:</strong> {cycle.expectedOvulation.toLocaleDateString()}</p>
                <button className="btn-secondary" style={{ width: '100%', marginTop: '10px' }} onClick={handleStartPeriod}>
                  Bắt đầu chu kỳ mới
                </button>
                <button className="btn-secondary" style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)' }} onClick={() => setShowHistoryModal(true)}>
                  📅 Nhập chu kỳ cũ (Lịch sử)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2>Tình trạng hôm nay</h2>
        {cycle ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '8px', background: 'var(--surface)', borderLeft: `4px solid ${getPregnancyChance(new Date(), cycle) === 'Trứng rụng' ? 'var(--secondary)' : getPregnancyChance(new Date(), cycle) === 'Cao' ? '#f8a5c2' : getPregnancyChance(new Date(), cycle) === 'Thấp' ? '#3498db' : '#2ecc71'}` }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Tỉ lệ thụ thai: <span style={{ color: 'var(--primary)' }}>{getPregnancyChance(new Date(), cycle) === 'Trứng rụng' ? 'Đỉnh điểm' : getPregnancyChance(new Date(), cycle)}</span></h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                {getPregnancyChance(new Date(), cycle) === 'Trứng rụng' && 'Hôm nay là ngày rụng trứng! Khả năng thụ thai đạt đỉnh điểm. Nếu không muốn có thai, hãy sử dụng biện pháp tránh thai an toàn.'}
                {getPregnancyChance(new Date(), cycle) === 'Cao' && 'Bạn đang trong cửa sổ thụ thai (khoảng thời gian dễ mang thai nhất trong tháng). Hãy lưu ý nhé!'}
                {getPregnancyChance(new Date(), cycle) === 'Thấp' && 'Khả năng thụ thai thấp, tuy nhiên vẫn có một phần trăm nhỏ xác suất xảy ra do thời gian rụng trứng có thể xê dịch.'}
                {getPregnancyChance(new Date(), cycle) === 'An toàn' && 'Hôm nay là ngày an toàn. Tỉ lệ mang thai gần như bằng 0, cơ thể đang ở trạng thái ổn định.'}
                {getPregnancyChance(new Date(), cycle) === 'Đang Hành Kinh' && 'Đang trong kỳ kinh nguyệt. Hãy giữ ấm cơ thể và nghỉ ngơi nhiều hơn.'}
              </p>
            </div>
          </div>
        ) : (
          <p>Hãy bắt đầu chu kỳ để xem các phân tích chi tiết nhé!</p>
        )}
      </div>
    </div>

    {showHistoryModal && (
      <CycleCalendarModal
        onSave={handleAddHistory}
        onClose={() => setShowHistoryModal(false)}
        existingCycles={allCycles}
      />
    )}
    </>
  );
};

export default Home;
