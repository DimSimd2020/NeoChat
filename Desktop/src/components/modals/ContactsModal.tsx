import { useState, useEffect } from 'react';
import { X, UserPlus, Search } from 'lucide-react';
import { Contact } from '../../types';
import { TauriService } from '../../services/TauriService';
import { useLanguage } from '../../i18n/LanguageContext';
import './ContactsModal.css';

interface ContactsModalProps {
    onClose: () => void;
}

export function ContactsModal({ onClose }: ContactsModalProps) {
    const { t } = useLanguage();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        TauriService.getContacts().then(setContacts).catch(() => { });
    }, []);

    const filtered = contacts.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="contacts-modal" onClick={e => e.stopPropagation()}>
                <div className="contacts-header">
                    <h3>{t('contacts.title')}</h3>
                    <button className="btn-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="contacts-search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder={t('common.search')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div className="contacts-list">
                    {filtered.length === 0 ? (
                        <div className="contacts-empty">
                            <UserPlus size={32} />
                            <p>{t('contacts.no_contacts')}</p>
                        </div>
                    ) : (
                        filtered.map(contact => (
                            <div key={contact.id} className="contact-row">
                                <div className="avatar small">
                                    {contact.avatar_url ? (
                                        <img src={contact.avatar_url} alt={contact.name} />
                                    ) : (
                                        contact.name.charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="contact-info">
                                    <span className="contact-name">{contact.name}</span>
                                    <span className="contact-status">{contact.status === 'online' ? t('common.online') : t('chats.last_seen')}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
