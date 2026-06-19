import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
  const { currentUser } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
    }
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
        <h2>Thông tin ứng dụng</h2>
        <p>Phiên bản: 1.0.0</p>
        <p>Bản quyền thuộc về Bloom App.</p>
      </div>
    </div>
  );
};

export default Settings;
