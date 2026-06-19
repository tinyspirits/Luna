import { useState, useEffect } from 'react';
import { getAllCycles } from '../services/firestore';
import type { Cycle } from '../services/firestore';
import { calculateSmartPredictions } from '../utils/cycleCalculations';
import { differenceInDays, format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { BarChart2, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const Insights = () => {
  const { viewingUid } = useAuth();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!viewingUid) return;
      setLoading(true);
      const data = await getAllCycles(viewingUid);
      setCycles(data);
      setLoading(false);
    };
    fetch();
  }, [viewingUid]);

  if (loading) {
    return <div className="animate-fade-in"><p>Đang phân tích dữ liệu...</p></div>;
  }

  if (cycles.length === 0) {
    return (
      <div className="animate-fade-in">
        <h1>Phân tích sức khỏe</h1>
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <BarChart2 size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
          <h3>Chưa có đủ dữ liệu</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Hãy ghi lại ít nhất 1 chu kỳ để Luna bắt đầu phân tích cho bạn nhé!
          </p>
        </div>
      </div>
    );
  }

  const prediction = calculateSmartPredictions(cycles);
  const sorted = [...cycles].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  // Tính độ dài thực tế từng chu kỳ theo kiểu Flo
  const cycleHistory: { startLabel: string; endLabel: string; length: number }[] = [];

  // Chu kỳ hiện tại (kỳ kinh gần nhất)
  const latestCycle = sorted[sorted.length - 1];
  const currentLen = differenceInDays(new Date(), latestCycle.startDate);
  cycleHistory.push({
    startLabel: format(latestCycle.startDate, "d 'thg' M"),
    endLabel: format(new Date(), "d 'thg' M"),
    length: currentLen > 0 ? currentLen : 1,
  });

  for (let i = sorted.length - 1; i >= 1; i--) {
    const len = differenceInDays(sorted[i].startDate, sorted[i - 1].startDate);
    if (len > 15 && len < 60) {
      cycleHistory.push({
        startLabel: format(sorted[i - 1].startDate, "d 'thg' M"),
        endLabel: format(sorted[i].startDate, "d 'thg' M"),
        length: len,
      });
    }
  }

  const maxBarLen = cycleHistory.length > 0 ? Math.max(...cycleHistory.map(c => c.length)) : 28;

  // Điểm sức khỏe
  const healthScore = Math.min(100, 40 + cycles.length * 8 + (prediction.isIrregular ? -15 : 10) + (prediction.confidence === 'high' ? 15 : prediction.confidence === 'medium' ? 8 : 0));
  const confidenceText = prediction.confidence === 'high' ? '🟢 Rất chính xác' : prediction.confidence === 'medium' ? '🟡 Khá chính xác' : '🔴 Cần thêm dữ liệu';

  return (
    <div className="animate-fade-in">
      <h1>Phân tích sức khỏe</h1>

      {/* Điểm sức khỏe */}
      <div className="card" style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2 style={{ marginBottom: '8px' }}>Điểm theo dõi sức khỏe</h2>
        <div style={{
          width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 16px',
          background: `conic-gradient(var(--primary) ${healthScore * 3.6}deg, var(--surface) 0deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>{healthScore}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ 100</span>
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Ghi chép càng đều, điểm càng cao và dự đoán càng chính xác!
        </p>
      </div>

      {/* Thống kê tổng quan */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <TrendingUp size={24} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>{prediction.averageCycleLength}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ngày / Chu kỳ TB</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <Clock size={24} style={{ color: 'var(--secondary)', marginBottom: '8px' }} />
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--secondary)' }}>{cycles.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chu kỳ đã ghi</div>
        </div>
      </div>

      {/* Trạng thái chu kỳ */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <h2>Độ đều đặn</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', background: prediction.isIrregular ? 'rgba(253,203,110,0.2)' : 'rgba(46,204,113,0.1)' }}>
          {prediction.isIrregular
            ? <AlertTriangle size={28} color="#f39c12" />
            : <CheckCircle size={28} color="#27ae60" />
          }
          <div>
            <div style={{ fontWeight: 'bold' }}>{prediction.isIrregular ? 'Chu kỳ không đều' : 'Chu kỳ đều đặn'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {prediction.isIrregular
                ? 'Chu kỳ của bạn có biến động lớn. Nên tham khảo ý kiến bác sĩ.'
                : 'Tuyệt vời! Chu kỳ của bạn rất ổn định.'
              }
            </div>
          </div>
        </div>
        <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Độ chính xác dự đoán: {confidenceText}
        </p>
      </div>

      {/* Biểu đồ Flo-style: Độ dài chu kỳ */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
          <h2 style={{ margin: 0 }}>Độ dài chu kỳ</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '0.05em' }}>TRUNG BÌNH: {prediction.averageCycleLength} ng</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {cycleHistory.map((c, i) => (
            <div key={i}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                {i === 0 && <span style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '0.75rem' }}>CHU KỲ HIỆN TẠI: </span>}
                {c.startLabel} - {c.endLabel}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '24px', borderRadius: '12px', background: 'var(--border)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(c.length / maxBarLen) * 100}%`,
                    borderRadius: '12px',
                    background: i === 0
                      ? 'linear-gradient(90deg, #e84393, #f8a5c2)'
                      : 'linear-gradient(90deg, #e84393aa, #f8a5c266)',
                    minWidth: '48px',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '0.95rem', minWidth: '56px', textAlign: 'right' }}>{c.length} ngày</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dự đoán tiếp theo */}
      <div className="card">
        <h2>Dự đoán tiếp theo</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>🩸 Kỳ kinh tiếp theo</span>
            <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{format(prediction.nextPeriodStart, 'dd/MM/yyyy')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>🥚 Ngày rụng trứng</span>
            <span style={{ fontWeight: 'bold', color: 'var(--secondary)' }}>{format(prediction.ovulationDate, 'dd/MM/yyyy')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>🌸 Cửa sổ thụ thai</span>
            <span style={{ fontWeight: 'bold', color: '#f8a5c2' }}>
              {format(prediction.fertileWindowStart, 'dd/MM')} – {format(prediction.fertileWindowEnd, 'dd/MM')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
