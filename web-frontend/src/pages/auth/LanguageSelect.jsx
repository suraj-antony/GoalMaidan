import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Globe } from 'lucide-react';

export default function LanguageSelect() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const handleLanguageSelect = async (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('lang', langCode);

    // If user is logged in, update profile
    if (user) {
      try {
        const res = await api.put('/auth/profile/', { language: langCode });
        setUser(res.data);
      } catch (e) {
        console.error("Failed to update user language");
      }
      navigate(-1); // go back
    } else {
      navigate('/login');
    }
  };

  const languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10">
        <Globe size={48} className="mx-auto text-primary-500 mb-4" />
        <h1 className="text-3xl font-bold">{t('language_select')}</h1>
        <p className="text-[var(--txt2)] mt-2">Choose your preferred language</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl">
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => handleLanguageSelect(lang.code)}
            className={`
              flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all
              ${i18n.language === lang.code 
                ? 'border-primary-500 bg-primary-50 shadow-lg scale-105' 
                : 'border-[var(--border)] bg-[var(--card)] hover:border-primary-300 hover:shadow-md'
              }
            `}
          >
            <span className="text-4xl font-bold mb-2 text-primary-600">{lang.native}</span>
            <span className="text-[var(--txt2)]">{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
