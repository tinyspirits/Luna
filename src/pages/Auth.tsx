import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError('Lỗi kết nối hoặc thông tin không chính xác. Vui lòng thử lại.');
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Vui lòng nhập email của bạn ở ô trên để lấy lại mật khẩu.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setError('');
      alert('Email khôi phục mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn!');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('Email này chưa được đăng ký trong hệ thống!');
      } else if (err.code === 'auth/invalid-email') {
        setError('Định dạng email không hợp lệ!');
      } else {
        setError('Lỗi: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          🌙 Luna
        </h1>
        <p>Theo dõi sức khỏe & Chu kỳ của bạn</p>
      </div>

      <div className="card">
        <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>
          {isLogin ? 'Đăng nhập' : 'Tạo tài khoản mới'}
        </h2>
        
        {error && <div style={{ background: '#ffeaa7', padding: '12px', borderRadius: '8px', color: '#d63031', marginBottom: '16px', fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Email</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Mật khẩu</label>
            <input 
              type="password" 
              required={!isLogin} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
            />
          </div>

          {isLogin && (
            <div style={{ textAlign: 'right', marginTop: '-8px' }}>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                disabled={loading}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}
              >
                Quên mật khẩu?
              </button>
            </div>
          )}

          <button 
            className="btn-primary" 
            type="submit" 
            disabled={loading || (isLogin && !password && !email)}
            style={{ width: '100%', padding: '14px', fontSize: '1.1rem', marginBottom: '16px' }}
          >
            {loading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            type="button"
            className="btn-secondary" 
            style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)' }}
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
