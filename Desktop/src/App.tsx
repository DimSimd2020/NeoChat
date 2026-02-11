import { useState, useEffect } from 'react';
import './App.css';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { Settings } from './components/Settings';
import { NewChatModal } from './components/modals/NewChatModal';
import { OnboardingScreen } from './components/OnboardingScreen';
import { TauriService } from './services/TauriService';
import { Chat, User } from './types';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    TauriService.getMyProfile().then(user => {
      setCurrentUser(user);
      setLoading(false);
    });
    TauriService.getChats().then(setChats);
  };

  useEffect(() => {
    fetchData();

    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleChatSelect = (id: string) => {
    setActiveChatId(id);
  };

  const handleChatCreated = () => {
    fetchData();
    setShowNewChatModal(false);
  };

  if (loading) {
    return <div className="app-container flex items-center justify-center">Loading...</div>;
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
      {showSidebar && (
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
      )}

      {/* Main Content Area */}
      {showMainContent && (
        <div className={`flex-1 flex flex-col h-full bg-main relative main-content ${!showMainContent ? 'hidden' : ''}`}>
          {showSettings ? (
            <Settings currentUser={currentUser} onClose={() => setShowSettings(false)} />
          ) : (
            <ChatWindow
              chatId={activeChatId}
              currentUser={currentUser}
              onBack={() => setActiveChatId(null)}
            />
          )}
        </div>
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
