import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock } from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login/', formData);
      login(res.data.user, res.data.tokens);
      
      if (res.data.user.role === 'organiser') {
        navigate('/dashboard');
      } else {
        navigate('/viewer');
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.error?.includes('not verified')) {
        localStorage.setItem('verify_email', formData.email);
        navigate('/verify-otp');
      } else {
        setError(err.response?.data?.error || 'Login failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      backgroundImage: `url('https://images.pexels.com/photos/36650896/pexels-photo-36650896.jpeg')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(0,20,10,0.55) 0%, rgba(0,20,10,0.7) 100%)',
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '440px',
      }}>
        <div 
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)',
            '--txt': '#ffffff',
            '--txt2': '#cbd5e1',
            '--border': 'rgba(255, 255, 255, 0.15)',
            '--bg': '#1e293b',
          }}
          className="w-full p-6 rounded-2xl text-white"
        >
          <div className="text-center mb-8">
            <div style={{
              fontSize: '40px',
              marginBottom: '8px',
              filter: 'drop-shadow(0 2px 8px rgba(21,128,61,0.3))',
            }}>
              ⚽
            </div>
            <h2 className="text-2xl font-bold text-emerald-400">Welcome Back</h2>
            <p className="text-[var(--txt2)] text-sm mt-1">Sign in to GoalMaidan</p>
          </div>
          
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-[var(--txt2)]" size={18} />
                <input
                  type="email"
                  required
                  className="pl-10 w-full rounded-md border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] focus:border-primary-500 focus:ring-primary-500"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-[var(--txt2)]" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="pl-10 pr-10 w-full rounded-md border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] focus:border-primary-500 focus:ring-primary-500"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--txt2)] hover:text-[var(--txt)] transition-colors duration-150 p-1 rounded"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
                           a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243
                           M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29
                           m7.532 7.532l3.29 3.29M3 3l3.59 3.59
                           m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7
                           a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none"
                         viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5
                           c4.478 0 8.268 2.943 9.542 7
                           -1.274 4.057-5.064 7-9.542 7
                           -4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-md shadow-md transition-colors disabled:opacity-50 mt-4"
            >
              {loading ? 'Signing in...' : t('login')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm border-t border-[var(--border)] pt-4">
            <p className="mb-2">Don't have an account? <Link to="/register" className="text-emerald-400 font-bold hover:text-emerald-300 hover:underline">Register here</Link></p>
            <Link to="/language" className="text-emerald-400 font-bold hover:text-emerald-300 hover:underline">{t('language_select')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
