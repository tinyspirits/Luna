import { useState } from 'react';
import { signOut, updatePassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { linkPartner, updateUserProfile, unlinkPartner } from '../services/firestore';
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
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [editingPartnerName, setEditingPartnerName] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [copied, setCopied] = useState(false);
  const [newPassword, setPasswordForChange] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentUser) return;
    if (newPassword.length < 6) {
      alert('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    
    setChangingPassword(true);
    try {
      await updatePassword(currentUser, newPassword);
      alert('Đổi mật khẩu thành công!');
      setPasswordForChange('');
    } catch (error: any) {
      console.error('Lỗi đổi mật khẩu:', error);
      if (error.code === 'auth/requires-recent-login') {
        alert('Phiên đăng nhập đã cũ. Vui lòng đăng xuất và đăng nhập lại để đổi mật khẩu.');
      } else {
        alert('Có lỗi xảy ra: ' + error.message);
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCopyCode = () => {
    if (currentUser?.uid) {
      navigator.clipboard.writeText(currentUser.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  const handleUnlinkPartner = async () => {
    if (!currentUser || !profile?.partnerUid) return;
    setLinking(true);
    const success = await unlinkPartner(currentUser.uid, profile.partnerUid);
    if (success) {
      await reloadProfile();
      alert('Đã hủy kết nối thành công!');
    } else {
      alert('Có lỗi xảy ra khi hủy kết nối.');
    }
    setLinking(false);
    setShowUnlinkConfirm(false);
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

        <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Đổi mật khẩu</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input 
              type="password" 
              placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
              value={newPassword}
              onChange={(e) => setPasswordForChange(e.target.value)}
              style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
            />
            <button 
              className="btn-primary" 
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword}
            >
              {changingPassword ? 'Đang xử lý...' : 'Cập nhật'}
            </button>
          </div>
        </div>

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
        <div 
          onClick={handleCopyCode}
          style={{ 
            background: 'var(--border)', 
            padding: '12px', 
            borderRadius: '8px', 
            textAlign: 'center', 
            fontWeight: 'bold', 
            letterSpacing: '2px', 
            marginBottom: '16px', 
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px'
          }}
          title="Nhấn để copy"
        >
          {copied ? <span style={{ color: 'var(--primary)', letterSpacing: 'normal' }}>Đã copy!</span> : (
             <>
               <span style={{ 
                 overflow: 'hidden', 
                 textOverflow: 'ellipsis', 
                 whiteSpace: 'nowrap',
                 maxWidth: '220px'
               }}>{currentUser?.uid}</span>
             </>
          )}
        </div>

        {profile?.partnerUid ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(46, 204, 113, 0.15)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(46, 204, 113, 0.4)' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27ae60', boxShadow: '0 0 8px #27ae60' }}></div>
                  <h3 style={{ color: '#27ae60', fontWeight: 700, margin: 0, fontSize: '1.05rem' }}>Đã kết nối</h3>
                </div>
                <button 
                  onClick={() => setShowUnlinkConfirm(true)} 
                  className="btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)', borderRadius: '12px', background: 'transparent' }}
                  disabled={linking}
                >
                  Hủy kết nối
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', margin: '0 0 0 18px', fontSize: '0.85rem' }}>
                Mã bạn đời: <span style={{ fontFamily: 'monospace', background: 'var(--surface)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-main)' }}>{profile.partnerUid.substring(0, 8)}...</span>
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px', paddingTop: '16px', borderTop: '1px dashed rgba(46, 204, 113, 0.3)' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tên hiển thị của đối phương:</label>
              {editingPartnerName ? (
                <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                  <input 
                    type="text" 
                    value={newPartnerName} 
                    onChange={e => setNewPartnerName(e.target.value)} 
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--primary)', flex: 1, outline: 'none' }} 
                    autoFocus
                  />
                  <button 
                    className="btn-primary" 
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }} 
                    onClick={async () => {
                      if (!currentUser || !newPartnerName.trim()) return;
                      await updateUserProfile(currentUser.uid, { partnerName: newPartnerName.trim() });
                      await reloadProfile();
                      setEditingPartnerName(false);
                    }}
                  >
                    Lưu
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }} 
                    onClick={() => setEditingPartnerName(false)}
                  >
                    Hủy
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{profile.partnerName || 'bạn đời'}</span>
                  <button 
                    onClick={() => { setNewPartnerName(profile.partnerName || ''); setEditingPartnerName(true); }} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline', padding: 0 }}
                  >
                    Đổi tên
                  </button>
                </div>
              )}
            </div>
          </div>
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

      {/* Modal xác nhận hủy kết nối */}
      {showUnlinkConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '320px', textAlign: 'center', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0' }}>Hủy kết nối?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>Bạn và người ấy sẽ không thể xem chu kỳ của nhau nữa. Bạn có chắc chắn không?</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowUnlinkConfirm(false)} className="btn-secondary" style={{ flex: 1 }}>Không</button>
              <button onClick={handleUnlinkPartner} className="btn-primary" style={{ flex: 1, background: 'var(--danger)' }} disabled={linking}>
                {linking ? 'Đang hủy...' : 'Hủy kết nối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
