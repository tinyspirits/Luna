import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { linkPartner } from '../services/firestore';

const Settings = () => {
  const { currentUser, profile, reloadProfile } = useAuth();
  const [partnerCode, setPartnerCode] = useState('');
  const [linking, setLinking] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
    }
  };

  const handleLinkPartner = async () => {
    if (!currentUser || !partnerCode.trim()) return;
    setLinking(true);
    const success = await linkPartner(currentUser.uid, partnerCode.trim());
    if (success) {
      await reloadProfile();
      alert('Đã kết nối với bạn đời thành công!');
    } else {
      alert('Có lỗi xảy ra khi kết nối. Vui lòng thử lại.');
    }
    setLinking(false);
  };

  return (
    <div className="animate-fade-in">
      <h1>Cài đặt</h1>

      <div className="card">
        <h2>Tài khoản của bạn</h2>
        <p style={{ marginBottom: '16px' }}><strong>Email:</strong> {currentUser?.email}</p>

        <button className="btn-secondary" onClick={handleLogout} style={{ width: '100%', color: '#d63031', borderColor: '#d63031' }}>
          Đăng xuất
        </button>
      </div>

      <div className="card">
        <h2>Chia sẻ cho bạn đời</h2>
        <p style={{ marginBottom: '8px' }}>Gửi mã này cho bạn đời để họ có thể xem chu kỳ của bạn:</p>
        <div style={{ background: 'var(--border)', padding: '12px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '16px', userSelect: 'all' }}>
          {currentUser?.uid}
        </div>

        {profile?.partnerUid ? (
          <p style={{ color: 'var(--secondary)', fontWeight: 600 }}>✅ Đã kết nối với bạn đời ({profile.partnerUid.substring(0, 8)}...)</p>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Nhập mã của bạn đời..."
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value)}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
            />
            <button className="btn-secondary" onClick={handleLinkPartner} disabled={linking}>
              {linking ? 'Đang nối...' : 'Kết nối'}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Thông tin ứng dụng</h2>
        <p>Phiên bản: 1.0.0</p>
        <p>Bản quyền thuộc về Luna App.</p>
      </div>
    </div>
  );
};

export default Settings;
