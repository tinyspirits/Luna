import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DailyCheckinModalProps {
  onClose: () => void;
}

const DailyCheckinModal = ({ onClose }: DailyCheckinModalProps) => {
  const navigate = useNavigate();

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="card animate-scale-up" style={{
        width: '100%',
        maxWidth: '400px',
        position: 'relative',
        padding: '30px 24px',
        textAlign: 'center'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'var(--surface)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-muted)'
          }}
        >
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', margin: '0 0 16px 0', lineHeight: 1.2 }}>
          Chào ngày mới! 👋
        </h2>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.5, marginBottom: '30px' }}>
          Hôm nay cơ thể bạn cảm thấy thế nào?<br/>
          Hãy dành 1 phút cập nhật để Luna hiểu bạn hơn và phân tích chu kỳ chính xác nhé!
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '14px', fontSize: '1.1rem', fontWeight: 'bold' }}
            onClick={() => {
              onClose();
              navigate('/log');
            }}
          >
            Ghi chép ngay
          </button>
          
          <button 
            className="btn-secondary" 
            style={{ width: '100%', padding: '14px', fontSize: '1.05rem', background: 'transparent' }}
            onClick={onClose}
          >
            Để sau nhé
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyCheckinModal;
