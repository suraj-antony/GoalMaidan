import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { shareMatchResult, shareFixture } from '../utils/whatsappShare';

export default function WhatsAppShareButton({ match, tournamentName, tournamentId, isFixture = false }) {
  const { t } = useTranslation();

  const handleShare = () => {
    if (isFixture) {
      shareFixture(match, tournamentName, tournamentId);
    } else {
      shareMatchResult(match, tournamentName, tournamentId);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={t('share_on_whatsapp')}
    >
      <MessageCircle size={16} />
      <span className="hidden sm:inline">{t('share_on_whatsapp')}</span>
    </button>
  );
}
