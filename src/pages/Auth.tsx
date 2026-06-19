import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
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
      setError('Lỗi kết nối. Vui lòng thử lại sau.');
    }
    setLoading(false);
  };

  const handleAnonymousLogin = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error(err);
      setError('Không thể đăng nhập ẩn danh lúc này. Vui lòng kiểm tra Firebase Console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '8px' }}>Luna</h1>
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
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}
            />
          </div>

          <button 
          className="btn-primary" 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', padding: '14px', fontSize: '1.1rem', marginBottom: '16px' }}
        >
          {loading ? 'Đang xử lý...' : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
        </button>

        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '16px' }}>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
          <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', padding: '0 10px', fontSize: '0.8rem', color: '#666' }}>HOẶC</span>
        </div>

        <button 
          type="button"
          onClick={handleAnonymousLogin}
          disabled={loading}
          style={{ width: '100%', padding: '14px', fontSize: '1.1rem', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Dùng thử không cần tài khoản
        </button>
      </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            type="button"
            className="btn-secondary" 
            style={{ width: '100%', background: 'transparent', border: '1px solid var(--border)' }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
