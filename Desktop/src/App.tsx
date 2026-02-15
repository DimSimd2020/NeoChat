import { useState, useEffect } from 'react';
import './App.css';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { Settings } from './components/Settings';
import { NewChatModal } from './components/modals/NewChatModal';
import { OnboardingScreen } from './components/OnboardingScreen';
import { PinLockScreen } from './components/PinLockScreen';
import { TauriService } from './services/TauriService';
import { Chat, User } from './types';
import { useLanguage } from './i18n/LanguageContext';

function App() {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(true);
  const [pinLocked, setPinLocked] = useState(() => !!localStorage.getItem('neochat_password_hash'));

  // Initialize chat background on app load
  useEffect(() => {
    const bg = localStorage.getItem('chatBackground') || 'default';
    const root = document.documentElement;
    const isLight = root.classList.contains('light');
    root.style.setProperty('--chat-bg-image', 'none');
    switch (bg) {
      case 'gradient':
        root.style.setProperty('--chat-bg', isLight
          ? 'linear-gradient(160deg, #E8E8ED 0%, #D1D1D6 50%, #E8E8ED 100%)'
          : 'linear-gradient(160deg, #1c1c1e 0%, #2c2c3e 50%, #1c1c2e 100%)');
        break;
      case 'black':
        root.style.setProperty('--chat-bg', isLight ? '#FFFFFF' : '#000000');
        break;
      case 'custom': {
        const img = localStorage.getItem('chatBgCustomImage');
        if (img) {
          root.style.setProperty('--chat-bg', isLight ? '#F2F2F7' : '#0F1117');
          root.style.setProperty('--chat-bg-image', `url(${img})`);
        }
        break;
      }
      default:
        root.style.setProperty('--chat-bg', isLight ? '#F2F2F7' : '#0F1117');
    }
  }, []);

  const fetchData = () => {
    TauriService.getMyProfile().then(user => {
      setCurrentUser(user);
      setLoading(false);
    });
    TauriService.getChats().then(setChats);
  };

  useEffect(() => {
    fetchData();

    // Poll for messages
    const interval = setInterval(() => {
      TauriService.pollMessages().then((newMsgs) => {
        if (newMsgs && newMsgs.length > 0) {
          // Refresh chats to show new last_msg
          TauriService.getChats().then(setChats);
        }
      }).catch(console.error);
    }, 2000);

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, []);

  const handleChatSelect = (id: string) => {
    setActiveChatId(id);
  };

  const handleChatCreated = () => {
    fetchData();
    setShowNewChatModal(false);
  };

  // PIN Lock Screen
  if (pinLocked) {
    return <PinLockScreen onUnlock={() => setPinLocked(false)} />;
  }

  if (loading) {
    return <div className="app-container loading-state">{t('common.loading')}</div>;
  }

  // Not registered? Show Onboarding
  if (currentUser && !currentUser.is_registered) {
    return <OnboardingScreen onComplete={fetchData} />;
  }

  // Determine what to show on mobile
  const showSidebar = !isMobile || !activeChatId;
  const showMainContent = !isMobile || activeChatId;

  return (
    <div className="app-container">
      {/* Sidebar Area */}
      <div className={`sidebar-container ${!showSidebar ? 'hidden' : ''}`}>
        <Sidebar
          currentUser={currentUser}
          chats={chats}
          activeChatId={activeChatId || undefined}
          onChatSelect={handleChatSelect}
          onNewChat={() => setShowNewChatModal(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col h-full bg-main relative main-content ${!showMainContent ? 'hidden' : ''}`}>
        <ChatWindow
          chatId={activeChatId}
          currentUser={currentUser}
          onBack={() => setActiveChatId(null)}
        />
      </div>

      {/* Settings Overlay — renders on top of everything */}
      {showSettings && (
        <Settings currentUser={currentUser} onClose={() => setShowSettings(false)} />
      )}

      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onChatCreated={handleChatCreated}
        />
      )}
    </div>
  );
}

export default App;
