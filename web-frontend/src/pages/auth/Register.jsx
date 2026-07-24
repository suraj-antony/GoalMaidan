import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { User, Mail, Lock, MapPin } from 'lucide-react';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'viewer', area_name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        language: localStorage.getItem('lang') || 'en'
      };
      
      if (formData.role === 'organiser') {
        payload.area_name = formData.area_name;
      }

      await api.post('/auth/register/', payload);
      // Store email temporarily for OTP screen
      localStorage.setItem('verify_email', formData.email);
      navigate('/verify-otp');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-[var(--card)] rounded-xl shadow-lg border border-[var(--border)]">
      <h2 className="text-2xl font-bold text-center mb-6 text-primary-600">{t('register')}</h2>
      
      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t('full_name')}</label>
          <div className="relative">
            <User className="absolute left-3 top-3 text-[var(--txt2)]" size={18} />
            <input
              type="text"
              required
              className="pl-10 w-full rounded-md border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] focus:border-primary-500 focus:ring-primary-500"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
        </div>

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

        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="block text-sm font-medium mb-1">Confirm</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-[var(--txt2)]" size={18} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                className="pl-10 pr-10 w-full rounded-md border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] focus:border-primary-500 focus:ring-primary-500"
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--txt2)] hover:text-[var(--txt)] transition-colors duration-150 p-1 rounded"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
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
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('role')}</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="role" 
                value="viewer"
                className="text-primary-600 focus:ring-primary-500"
                checked={formData.role === 'viewer'}
                onChange={e => setFormData({...formData, role: e.target.value})}
              />
              {t('viewer')}
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="role" 
                value="organiser"
                className="text-primary-600 focus:ring-primary-500"
                checked={formData.role === 'organiser'}
                onChange={e => setFormData({...formData, role: e.target.value})}
              />
              {t('organiser')}
            </label>
          </div>
        </div>

        {formData.role === 'organiser' && (
          <div>
            <label className="block text-sm font-medium mb-1">{t('area_name')}</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-[var(--txt2)]" size={18} />
              <input
                type="text"
                required
                className="pl-10 w-full rounded-md border-[var(--border)] bg-[var(--bg)] text-[var(--txt)] focus:border-primary-500 focus:ring-primary-500"
                value={formData.area_name}
                onChange={e => setFormData({...formData, area_name: e.target.value})}
              />
            </div>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-md shadow-md transition-colors disabled:opacity-50 mt-4"
        >
          {loading ? 'Processing...' : t('register')}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <p className="mb-2">Already have an account? <Link to="/login" className="text-primary-600 hover:underline">Login here</Link></p>
        <Link to="/language" className="text-blue-500 hover:underline">{t('language_select')}</Link>
      </div>
    </div>
  );
}
