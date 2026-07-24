import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import DarkModeToggle from './DarkModeToggle';
import { LogOut } from 'lucide-react';

export default function Navbar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-[var(--card)] border-b border-[var(--border)] z-50 flex items-center justify-between px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Link to={user?.role === 'organiser' ? '/dashboard' : '/viewer'} className="text-xl font-bold text-primary-500">
          ⚽ TourneyFC
        </Link>
      </div>
      
      <div className="flex items-center gap-4">
        <DarkModeToggle />
        
        {user ? (
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-block font-medium">
              {t('dashboard')} - {user.name}
            </span>
            <button 
              onClick={logout}
              className="p-2 rounded-full hover:bg-[var(--bg2)] transition-colors text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title={t('logout')}
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link to="/login" className="px-4 py-2 rounded-md hover:bg-[var(--bg2)] font-medium">
              {t('login')}
            </Link>
            <Link to="/register" className="px-4 py-2 rounded-md bg-primary-500 text-white hover:bg-primary-600 font-medium shadow-sm transition-colors">
              {t('register')}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
