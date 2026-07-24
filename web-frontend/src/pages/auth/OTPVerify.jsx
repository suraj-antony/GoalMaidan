import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function OTPVerify() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  
  const inputRefs = useRef([]);
  const email = localStorage.getItem('verify_email');

  useEffect(() => {
    if (!email) navigate('/login');
    
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [email, navigate]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value !== '' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return setError('Please enter a 6-digit code');

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/verify-email/', { email, otp: code });
      login(res.data.user, res.data.tokens);
      localStorage.removeItem('verify_email');
      
      if (res.data.user.role === 'organiser') {
        navigate('/dashboard');
      } else {
        navigate('/viewer');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-[var(--card)] rounded-xl shadow-lg border border-[var(--border)] text-center">
      <h2 className="text-2xl font-bold mb-2">{t('verify_otp')}</h2>
      <p className="text-[var(--txt2)] mb-8 text-sm">
        We sent a 6-digit code to <strong>{email}</strong>
      </p>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="flex justify-center gap-2 mb-6">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => inputRefs.current[i] = el}
              type="text"
              maxLength={1}
              className="w-12 h-14 text-center text-2xl font-bold rounded-md border-[var(--border)] bg-[var(--bg2)] text-[var(--txt)] focus:border-primary-500 focus:ring-primary-500 focus:bg-[var(--bg)]"
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
            />
          ))}
        </div>

        <button 
          type="submit" 
          disabled={loading || timeLeft === 0}
          className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-md shadow-md transition-colors disabled:opacity-50"
        >
          {loading ? 'Verifying...' : t('verify_otp')}
        </button>
      </form>

      <div className="mt-6 text-sm">
        <p className="text-[var(--txt2)]">Code expires in <span className="font-bold text-red-500">{formatTime(timeLeft)}</span></p>
        <button 
          className="mt-4 text-primary-600 font-semibold hover:underline focus:outline-none"
          onClick={() => {
            // In reality, you'd have a resend OTP endpoint
            alert('A new code would be sent here.');
            setTimeLeft(600);
          }}
        >
          {t('resend_otp')}
        </button>
      </div>
    </div>
  );
}
