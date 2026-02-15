import { useState, useEffect } from 'react';
import { User as UserIcon, Users, X, Search, QrCode, Check } from 'lucide-react';
import { Contact } from '../../types';
import { TauriService } from '../../services/TauriService';
import { QRScannerModal } from './QRScannerModal';
import { useLanguage } from '../../i18n/LanguageContext';
import './NewChatModal.css';

interface NewChatModalProps {
    onClose: () => void;
    onChatCreated: () => void;
}

export function NewChatModal({ onClose, onChatCreated }: NewChatModalProps) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'private' | 'group'>('private');
    const [searchQuery, setSearchQuery] = useState('');
    const [pubkeyInput, setPubkeyInput] = useState('');
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [groupName, setGroupName] = useState('');
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [showScanner, setShowScanner] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        TauriService.getContacts().then(setContacts);
    }, []);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length > 1) {
            const results = await TauriService.searchUsers(query);
            setContacts(results);
        } else {
            TauriService.getContacts().then(setContacts);
        }
    };

    const handleCreatePrivate = async () => {
        if (!pubkeyInput && !selectedContacts.length) return;
        setIsLoading(true);
        setError(null);
        try {
            const pk = pubkeyInput || selectedContacts[0];
            await TauriService.createChat(pk);
            onChatCreated();
            onClose();
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName || selectedContacts.length === 0) return;
        setIsLoading(true);
        setError(null);
        try {
            await TauriService.createGroup(groupName, selectedContacts);
            onChatCreated();
            onClose();
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsLoading(false);
        }
    };

    const toggleContactSelection = (id: string) => {
        if (activeTab === 'private') {
            setSelectedContacts([id]);
            setPubkeyInput(id);
        } else {
            setSelectedContacts(prev =>
                prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
            );
        }
    };

    const handleScanResult = (result: string) => {
        setPubkeyInput(result);
        setShowScanner(false);
    };

    return (
        <div className="modal-overlay">
            {showScanner && (
                <QRScannerModal
                    onScan={handleScanResult}
                    onClose={() => setShowScanner(false)}
                />
            )}

            <div className="modal-container">
                {/* Header */}
                <div className="modal-header">
                    <h2>{t('new_chat.title')}</h2>
                    <button onClick={onClose} className="close-btn" aria-label={t('common.close')}>
                        <X size={22} />
                    </button>
                </div>

                {/* Content */}
                <div className="modal-content">
                    {/* Tabs */}
                    <div className="tabs-container">
                        <button
                            className={`tab-btn private ${activeTab === 'private' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('private'); setSelectedContacts([]); }}
                        >
                            <UserIcon size={18} />
                            <span>{t('new_chat.private')}</span>
                        </button>
                        <button
                            className={`tab-btn group ${activeTab === 'group' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('group'); setSelectedContacts([]); }}
                        >
                            <Users size={18} />
                            <span>{t('new_chat.group')}</span>
                        </button>
                    </div>

                    {activeTab === 'private' ? (
                        <div className="input-group">
                            <label className="input-label">{t('new_chat.pubkey_label')}</label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    className="modern-input"
                                    placeholder={t('new_chat.pubkey_placeholder')}
                                    value={pubkeyInput}
                                    onChange={(e) => setPubkeyInput(e.target.value)}
                                />
                                <button
                                    className="input-icon-btn"
                                    onClick={() => setShowScanner(true)}
                                    title={t('qr.scan_title')}
                                >
                                    <QrCode size={22} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="input-group">
                            <label className="input-label">{t('new_chat.group_name_label')}</label>
                            <input
                                type="text"
                                className="modern-input"
                                placeholder={t('new_chat.group_name_placeholder')}
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Contact Selection */}
                    <div className="input-group">
                        <label className="input-label">
                            {activeTab === 'group' ? `${t('new_chat.group_contact_select_label')} (${selectedContacts.length})` : t('new_chat.contact_select_label')}
                        </label>

                        {/* Search Bar */}
                        <div className="search-wrapper">
                            <Search className="search-icon" size={16} />
                            <input
                                type="text"
                                className="modern-input search-input"
                                placeholder={t('common.search')}
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>

                        {/* Contacts List */}
                        <div className="contacts-list">
                            {contacts.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 text-sm italic">{t('new_chat.no_contacts')}</div>
                            ) : (
                                contacts.map(contact => (
                                    <div
                                        key={contact.id}
                                        onClick={() => toggleContactSelection(contact.id)}
                                        className={`contact-item ${selectedContacts.includes(contact.id) ? 'selected' : ''}`}
                                    >
                                        <div className={`checkbox ${activeTab === 'group' ? 'group-checkbox' : ''}`}>
                                            {selectedContacts.includes(contact.id) && <Check size={12} color="white" />}
                                        </div>
                                        <div className="contact-avatar">
                                            {contact.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="contact-info">
                                            <div className="contact-name">{contact.name}</div>
                                            <div className="contact-id">{contact.id}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="error-msg">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="modal-footer">
                    <button
                        className={`primary-btn ${activeTab === 'group' ? 'group-btn' : ''}`}
                        onClick={activeTab === 'private' ? handleCreatePrivate : handleCreateGroup}
                        disabled={isLoading || (activeTab === 'group' && (!groupName || selectedContacts.length === 0)) || (activeTab === 'private' && !pubkeyInput && selectedContacts.length === 0)}
                    >
                        {isLoading ? '...' : (activeTab === 'private' ? t('new_chat.start_chat') : t('new_chat.create_group'))}
                    </button>
                </div>
            </div>
        </div>
    );
}
