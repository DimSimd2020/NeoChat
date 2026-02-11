import { useState, useEffect } from 'react';
import { User as UserIcon, Users, X, Search, QrCode, Check } from 'lucide-react';
import { Contact } from '../../types';
import { TauriService } from '../../services/TauriService';
import { QRScannerModal } from './QRScannerModal';
import { useLanguage } from '../../i18n/LanguageContext';

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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1100] p-4 backdrop-blur-sm">
            {showScanner && (
                <QRScannerModal
                    onScan={handleScanResult}
                    onClose={() => setShowScanner(false)}
                />
            )}

            <div className="bg-[#1C1C1E] w-full max-w-md rounded-[28px] border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#2C2C2E]/50 backdrop-blur-md">
                    <h2 className="text-xl font-bold text-white tracking-tight">{t('new_chat.title')}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all">
                        <X size={22} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Tabs */}
                    <div className="flex p-1 gap-1 bg-black/20 rounded-2xl">
                        <button
                            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-semibold ${activeTab === 'private' ? 'bg-[#0A84FF] text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:text-gray-200'}`}
                            onClick={() => { setActiveTab('private'); setSelectedContacts([]); }}
                        >
                            <UserIcon size={18} />
                            <span>{t('new_chat.private')}</span>
                        </button>
                        <button
                            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all font-semibold ${activeTab === 'group' ? 'bg-[#30D158] text-white shadow-lg shadow-green-500/20' : 'text-gray-400 hover:text-gray-200'}`}
                            onClick={() => { setActiveTab('group'); setSelectedContacts([]); }}
                        >
                            <Users size={18} />
                            <span>{t('new_chat.group')}</span>
                        </button>
                    </div>

                    {activeTab === 'private' ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('new_chat.pubkey_label')}</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 pr-12 text-white focus:border-[#0A84FF] focus:outline-none focus:ring-4 ring-blue-500/10 transition-all font-mono text-sm placeholder:text-gray-600"
                                        placeholder={t('new_chat.pubkey_placeholder')}
                                        value={pubkeyInput}
                                        onChange={(e) => setPubkeyInput(e.target.value)}
                                    />
                                    <button
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0A84FF] hover:scale-110 transition-transform"
                                        onClick={() => setShowScanner(true)}
                                        title="Scan QR Code"
                                    >
                                        <QrCode size={22} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">{t('new_chat.group_name_label')}</label>
                            <input
                                type="text"
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white focus:border-[#30D158] focus:outline-none focus:ring-4 ring-green-500/10 transition-all placeholder:text-gray-600"
                                placeholder={t('new_chat.group_name_placeholder')}
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Contact Selection */}
                    <div className="space-y-3 pt-2">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                            {activeTab === 'group' ? `${t('new_chat.group_contact_select_label')} (${selectedContacts.length})` : t('new_chat.contact_select_label')}
                        </label>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                            <input
                                type="text"
                                className="w-full bg-black/20 border border-transparent rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:bg-black/40 focus:outline-none transition-all placeholder:text-gray-600"
                                placeholder={t('common.search')}
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>

                        {/* Contacts List */}
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                            {contacts.length === 0 ? (
                                <div className="text-center py-6 text-gray-600 text-sm italic">{t('new_chat.no_contacts')}</div>
                            ) : (
                                contacts.map(contact => (
                                    <div
                                        key={contact.id}
                                        onClick={() => toggleContactSelection(contact.id)}
                                        className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${selectedContacts.includes(contact.id) ? 'bg-white/5 border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedContacts.includes(contact.id) ? (activeTab === 'group' ? 'bg-[#30D158] border-[#30D158]' : 'bg-[#0A84FF] border-[#0A84FF]') : 'border-gray-700'}`}>
                                            {selectedContacts.includes(contact.id) && <Check size={12} className="text-white fill-current stroke-[4px]" />}
                                        </div>
                                        <div className="avatar w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                                            {contact.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-white truncate">{contact.name}</div>
                                            <div className="text-[10px] text-gray-600 truncate font-mono mt-0.5">{contact.id}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-400 text-xs bg-red-400/10 p-4 rounded-2xl border border-red-400/20 animate-in shake duration-500">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-6 border-t border-white/5 bg-[#2C2C2E]/20">
                    <button
                        className={`w-full py-4 rounded-2xl font-bold text-white transition-all transform active:scale-[0.98] shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed ${activeTab === 'private' ? 'bg-gradient-to-r from-[#0A84FF] to-[#007AFF] hover:shadow-blue-500/20' : 'bg-gradient-to-r from-[#30D158] to-[#28CD41] hover:shadow-green-500/20'
                            }`}
                        onClick={activeTab === 'private' ? handleCreatePrivate : handleCreateGroup}
                        disabled={isLoading || (activeTab === 'group' && (!groupName || selectedContacts.length === 0))}
                    >
                        {isLoading ? '...' : (activeTab === 'private' ? t('new_chat.start_chat') : t('new_chat.create_group'))}
                    </button>
                </div>
            </div>
        </div>
    );
}
