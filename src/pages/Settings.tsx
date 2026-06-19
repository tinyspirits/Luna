import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { linkPartner, updateUserProfile } from '../services/firestore';
import { UploadCloud } from 'lucide-react';

const PRESET_BGS = [
  { name: 'Mặc định', value: '' },
  { name: 'Luna Dạ Quang', value: 'linear-gradient(to bottom, #192a56, #273c75)' },
  { name: 'Hoàng hôn', value: 'linear-gradient(to bottom, #f8a5c2, #f5cd79)' },
  { name: 'Rừng đêm', value: 'linear-gradient(to bottom, #130f40, #30336b)' },
];

const ICONS = ['🩸', '🐷', '🌸', '🌙', '🔴', '💧', '🧸'];

const Settings = () => {
  const { currentUser, profile, reloadProfile } = useAuth();
  const [partnerCode, setPartnerCode] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [linking, setLinking] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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
    const success = await linkPartner(currentUser.uid, partnerCode.trim(), partnerName.trim());
    if (success) {
      await reloadProfile();
      alert('Đã kết nối với bạn đời thành công!');
    } else {
      alert('Có lỗi xảy ra khi kết nối. Vui lòng thử lại.');
    }
    setLinking(false);
  };

  const handleUpdateTheme = async (bg: string, icon: string) => {
    if (!currentUser) return;
    setSavingTheme(true);
    const success = await updateUserProfile(currentUser.uid, { themeBackground: bg, periodIcon: icon });
    if (success) {
      await reloadProfile();
    } else {
      alert('Lỗi khi lưu giao diện!');
    }
    setSavingTheme(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    
    // Giới hạn ảnh 3MB để tránh tràn bộ nhớ LocalStorage
    if (file.size > 3 * 1024 * 1024) {
      alert('Vui lòng chọn ảnh nhỏ hơn 3MB (do lưu trữ trực tiếp trên máy).');
      return;
    }

    setUploadingImage(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64String = event.target?.result as string;
      try {
        localStorage.setItem(`custom_bg_${currentUser.uid}`, base64String);
        await updateUserProfile(currentUser.uid, { themeBackground: 'local' });
        await reloadProfile();
      } catch (err) {
        console.error(err);
        alert('Không thể lưu ảnh. Có thể ảnh quá lớn so với bộ nhớ tạm của trình duyệt.');
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="animate-fade-in">
      <h1>Cài đặt</h1>

      <div className="card">
        <h2>Tài khoản của bạn</h2>
        <p style={{ marginBottom: '16px' }}><strong>Email:</strong> {currentUser?.email}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <label style={{ fontWeight: 600 }}>Giới tính:</label>
          <select 
            value={profile?.gender || 'female'} 
            onChange={async (e) => {
              if (currentUser) {
                await updateUserProfile(currentUser.uid, { gender: e.target.value as 'male' | 'female' });
                await reloadProfile();
              }
            }}
            style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', flex: 1, color: 'var(--text-main)', background: 'var(--surface)' }}
          >
            <option value="female">Nữ (Theo dõi chu kỳ)</option>
            <option value="male">Nam (Theo dõi bạn đời)</option>
          </select>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {profile?.gender === 'male' ? 'Bạn đang ở chế độ xem chu kỳ của bạn đời. Nếu chưa kết nối, vui lòng nhập mã bên dưới.' : 'Chế độ Nữ cho phép bạn tự theo dõi chu kỳ của mình và xem chu kỳ của bạn đời (nếu có).'}
        </p>

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
          <p style={{ color: 'var(--secondary)', fontWeight: 600 }}>✅ Đã kết nối với {profile.partnerName || 'bạn đời'} ({profile.partnerUid.substring(0, 8)}...)</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="text"
              placeholder="Tên gọi của người ấy (Ví dụ: Bé iu, Chồng...)"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
            />
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
          </div>
        )}
      </div>

      <div className="card">
        <h2>Giao diện & Cá nhân hóa</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Hình nền</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {PRESET_BGS.map(bg => (
              <button 
                key={bg.name}
                onClick={() => handleUpdateTheme(bg.value, profile?.periodIcon || '🩸')}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '20px', 
                  border: profile?.themeBackground === bg.value ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: bg.value || 'var(--surface)',
                  color: bg.value && bg.value !== 'var(--background)' ? '#fff' : 'inherit'
                }}
              >
                {bg.name}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <input 
              type="file" 
              id="bg-upload"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              disabled={uploadingImage || savingTheme}
            />
            <label 
              htmlFor="bg-upload"
              className="btn-secondary"
              style={{ 
                flex: 1, 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: uploadingImage || savingTheme ? 'not-allowed' : 'pointer',
                opacity: uploadingImage || savingTheme ? 0.7 : 1
              }}
            >
              <UploadCloud size={20} />
              {uploadingImage ? 'Đang tải lên...' : 'Tải ảnh nền từ máy lên'}
            </label>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Biểu tượng Hành kinh</h3>
          <div style={{ display: 'flex', gap: '12px', fontSize: '1.5rem', flexWrap: 'wrap' }}>
            {ICONS.map(icon => (
              <button 
                key={icon}
                onClick={() => handleUpdateTheme(profile?.themeBackground || '', icon)}
                style={{ 
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: (profile?.periodIcon || '🩸') === icon ? 1 : 0.4,
                  transform: (profile?.periodIcon || '🩸') === icon ? 'scale(1.3)' : 'none',
                  transition: 'all 0.2s'
                }}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
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
