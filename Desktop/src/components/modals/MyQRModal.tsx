import { X } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { User } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import './MyQRModal.css';

interface MyQRModalProps {
    currentUser: User | null;
    onClose: () => void;
}

export function MyQRModal({ currentUser, onClose }: MyQRModalProps) {
    const { t } = useLanguage();

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="myqr-modal" onClick={e => e.stopPropagation()}>
                <div className="myqr-header">
                    <h3>{t('qr_modal.title')}</h3>
                    <button className="btn-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="myqr-body">
                    <div className="myqr-avatar">
                        {currentUser?.avatar_url ? (
                            <img src={currentUser.avatar_url} alt={currentUser.username} />
                        ) : (
                            currentUser?.username?.charAt(0).toUpperCase()
                        )}
                    </div>
                    <h4 className="myqr-username">{currentUser?.username}</h4>
                    <div className="myqr-code">
                        {currentUser?.id && (
                            <QRCode
                                value={currentUser.id}
                                size={220}
                                bgColor="transparent"
                                fgColor="#ffffff"
                                includeMargin={false}
                            />
                        )}
                    </div>
                    <p className="myqr-desc">{t('qr_modal.share_desc')}</p>
                    <div className="myqr-id">{currentUser?.id}</div>
                </div>
            </div>
        </div>
    );
}
