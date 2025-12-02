
import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { MessageBubble } from './components/MessageBubble';
import { SettingsModal } from './components/SettingsModal';
import { DictionaryModal } from './components/DictionaryModal';
import { ShareModal } from './components/ShareModal';
import { LandingPage } from './components/LandingPage';
import { PricingPage } from './components/PricingPage';
import { AboutPage } from './components/AboutPage';
import { TermsPage } from './components/TermsPage';
import { PrivacyPage } from './components/PrivacyPage';
import { ContactPage } from './components/ContactPage';
import { ComingSoonPage } from './components/ComingSoonPage';
import { Message, Role, ChatSession } from './types';
import { streamChatResponse, transcribeAudio } from './services/geminiService';
import { WELCOME_MESSAGE, VOICE_LANGUAGES } from './constants';
import { Logo } from './components/Logo';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 15);

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      resolve(base64String.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

interface NotificationState {
  message: string;
  type: 'error' | 'info';
}

const App: React.FC = () => {
  // Routing State
  const [showLanding, setShowLanding] = useState(true);
  const [showPricing, setShowPricing] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);

  // Session Management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(generateId());

  // Current Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: generateId(),
      role: Role.MODEL,
      text: WELCOME_MESSAGE,
      timestamp: new Date(),
    }
  ]);

  // Settings persistence preference
  const [saveSettings, setSaveSettings] = useState<boolean>(() => {
      const saved = localStorage.getItem('mdnexa_save_settings');
      return saved === null ? true : saved === 'true';
  });

  // Initialize from LocalStorage for persistence
  const [region, setRegion] = useState<string>(() => {
      if (localStorage.getItem('mdnexa_save_settings') === 'false') return "North America";
      return localStorage.getItem('mdnexa_region') || "North America";
  });
  const [country, setCountry] = useState<string>(() => {
      if (localStorage.getItem('mdnexa_save_settings') === 'false') return "United States";
      return localStorage.getItem('mdnexa_country') || "United States";
  });
  const [voiceLanguage, setVoiceLanguage] = useState<string>(() => {
      if (localStorage.getItem('mdnexa_save_settings') === 'false') return "en-US";
      return localStorage.getItem('mdnexa_voice_language') || "en-US";
  });
  const [isShortAnswer, setIsShortAnswer] = useState<boolean>(() => {
      if (localStorage.getItem('mdnexa_save_settings') === 'false') return false;
      return localStorage.getItem('mdnexa_short_answer') === 'true';
  });
  
  // Theme & Appearance State
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('mdnexa_theme') || 'system');
  const [fontSize, setFontSize] = useState<string>(() => {
      if (localStorage.getItem('mdnexa_save_settings') === 'false') return "normal";
      return localStorage.getItem('mdnexa_font_size') || "normal";
  });

  // User Profile State
  const [userName, setUserName] = useState<string>(() => {
      if (localStorage.getItem('mdnexa_save_settings') === 'false') return "Dr. Alex Mercer";
      return localStorage.getItem('mdnexa_user_name') || "Dr. Alex Mercer";
  });
  const [userRole, setUserRole] = useState<string>(() => {
      if (localStorage.getItem('mdnexa_save_settings') === 'false') return "Physician";
      return localStorage.getItem('mdnexa_user_role') || "Physician";
  });
  
  // UI State
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState({ title: '', text: '', url: '' });

  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isMicSupported, setIsMicSupported] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Abort Controller for stopping generation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  const showNotification = (message: string, type: 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 6000); 
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isAtBottom = distanceFromBottom < 100;
      shouldAutoScrollRef.current = isAtBottom;
      setShowScrollBottom(distanceFromBottom > 400);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => {
        if (prev === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark';
        }
        return prev === 'dark' ? 'light' : 'dark';
    });
  };

  const handleOpenShare = (title: string, text: string, specificUrl?: string) => {
    const isMessageShare = !specificUrl;

    // 1. Construct Text
    // If it's a message share, append the website footer. 
    // If it's a specific URL share (sidebar), keep text as is (it's the description).
    const shareText = isMessageShare ? `${text}\n\nwww.mdnexa.com` : text;

    // 2. Construct URL
    // Fallback for modal buttons that require a URL parameter (e.g., Facebook).
    // For Sidebar share, use specificUrl.
    const shareUrl = specificUrl || "https://www.mdnexa.com";

    // 3. Attempt Native Share with Fallback
    if (navigator.share) {
        navigator.share({
            title: title,
            text: shareText,
            // Only include URL if it is explicitly a Link Share (sidebar).
            // For Message Share, omit 'url' so mobile devices treat it as a text paste/share,
            // preventing the generation of a generic link preview card.
            url: isMessageShare ? undefined : shareUrl,
        }).catch((err) => {
            console.warn("Native share failed/cancelled, falling back to modal.");
            setShareData({
                title,
                text: shareText,
                url: shareUrl
            });
            setIsShareModalOpen(true);
        });
    } else {
        // Fallback to custom modal
        setShareData({
            title,
            text: shareText,
            url: shareUrl
        });
        setIsShareModalOpen(true);
    }
  };

  // Check for Speech Recognition API support (Chrome/Safari) to hide on unsupported browsers (Firefox)
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const hasSpeechRecognition = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
        setIsMicSupported(!!hasSpeechRecognition);
    }
  }, []);

  useEffect(() => {
    if (shouldAutoScrollRef.current && !showLanding && !showPricing && !showAbout && !showTerms && !showPrivacy && !showContact) {
      scrollToBottom();
    }
  }, [messages, showLanding, showPricing, showAbout, showTerms, showPrivacy, showContact]);

  useEffect(() => {
    localStorage.setItem('mdnexa_save_settings', String(saveSettings));

    if (saveSettings) {
        localStorage.setItem('mdnexa_region', region);
        localStorage.setItem('mdnexa_country', country);
        localStorage.setItem('mdnexa_voice_language', voiceLanguage);
        localStorage.setItem('mdnexa_short_answer', String(isShortAnswer));
        localStorage.setItem('mdnexa_font_size', fontSize);
        localStorage.setItem('mdnexa_user_name', userName);
        localStorage.setItem('mdnexa_user_role', userRole);
    } else {
        localStorage.removeItem('mdnexa_region');
        localStorage.removeItem('mdnexa_country');
        localStorage.removeItem('mdnexa_voice_language');
        localStorage.removeItem('mdnexa_short_answer');
        localStorage.removeItem('mdnexa_font_size');
        localStorage.removeItem('mdnexa_user_name');
        localStorage.removeItem('mdnexa_user_role');
    }
  }, [saveSettings, region, country, voiceLanguage, isShortAnswer, fontSize, userName, userRole]);

  useEffect(() => {
    localStorage.setItem('mdnexa_theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (fontSize === 'small') {
        root.style.fontSize = '87.5%'; // ~14px
    } else if (fontSize === 'large') {
        root.style.fontSize = '112.5%'; // ~18px
    } else {
        root.style.fontSize = '100%'; // 16px
    }
  }, [fontSize]);

  useEffect(() => {
    if (messages.length <= 1) return;

    setSessions(prevSessions => {
      const existingSessionIndex = prevSessions.findIndex(s => s.id === currentSessionId);
      const title = messages.find(m => m.role === Role.USER)?.text.slice(0, 40) + (messages.find(m => m.role === Role.USER)?.text.length! > 40 ? '...' : '') || "New Consultation";

      // Important: Preserve existing isFavorite status if updating
      const isFavorite = existingSessionIndex >= 0 ? prevSessions[existingSessionIndex].isFavorite : false;

      const currentSessionData: ChatSession = {
        id: currentSessionId,
        title: title,
        messages: messages,
        region: region,
        country: country,
        updatedAt: new Date(),
        isFavorite: isFavorite,
      };

      if (existingSessionIndex >= 0) {
        const newSessions = [...prevSessions];
        newSessions[existingSessionIndex] = currentSessionData;
        return newSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      } else {
        return [currentSessionData, ...prevSessions];
      }
    });
  }, [messages, region, country, currentSessionId]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    if (isRecording) {
      stopRecording();
    }

    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userText = input.trim();
    setInput('');
    
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }

    const newUserMessage: Message = {
      id: generateId(),
      role: Role.USER,
      text: userText,
      timestamp: new Date(),
    };

    shouldAutoScrollRef.current = true;
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    const aiMessageId = generateId();
    const initialAiMessage: Message = {
      id: aiMessageId,
      role: Role.MODEL,
      text: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, initialAiMessage]);

    try {
      await streamChatResponse({
        history: messages,
        newMessage: userText,
        region,
        country,
        userRole, // Pass the professional role to the AI
        isShortAnswer,
        onChunk: (streamedText) => {
          setMessages((prev) => 
            prev.map((msg) => 
              msg.id === aiMessageId ? { ...msg, text: streamedText } : msg
            )
          );
        },
        signal: abortController.signal
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation stopped by user');
      } else {
        console.error(error);
        setMessages((prev) => 
            prev.map((msg) => 
                msg.id === aiMessageId 
                ? { ...msg, text: "I apologize, but I encountered an error processing your request. Please try again.", isError: true } 
                : msg
            )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // ---- Audio Recording & Transcription Logic ----

  const startRecording = async () => {
    // Basic Feature Detection
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification("Microphone not available.", 'error');
        return;
    }

    try {
      // Specifically request audio. This call will trigger the browser permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const preferredTypes = [
        'audio/webm;codecs=opus', 
        'audio/webm', 
        'audio/mp4',
        'audio/aac', 
        'audio/ogg;codecs=opus', 
        'audio/ogg',
        'audio/wav'
      ];
      
      let selectedMimeType = '';
      for (const type of preferredTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      const finalMimeType = mediaRecorder.mimeType || selectedMimeType || 'audio/webm';

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsTranscribing(true);

        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length === 0) {
          setIsTranscribing(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: finalMimeType });
        
        try {
          const base64Audio = await blobToBase64(audioBlob);
          const transcription = await transcribeAudio(base64Audio, finalMimeType, voiceLanguage);
          
          if (transcription) {
             setInput(prev => {
                const separator = prev && !prev.endsWith(' ') ? ' ' : '';
                return prev + separator + transcription;
             });
             setTimeout(() => {
               if(textareaRef.current) {
                 textareaRef.current.style.height = 'auto';
                 textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
               }
             }, 10);
          }
        } catch (error) {
          console.error("Transcription failed", error);
          showNotification("Transcription failed.", 'error');
        } finally {
          setIsTranscribing(false);
        }
      };

      // Firefox requires timeslice to avoid empty blobs
      mediaRecorder.start(200); 
      setIsRecording(true);
      
    } catch (err: any) {
      console.warn("Microphone initialization failed", err); 
      setIsRecording(false);
      // Neutral error message to avoid incorrect advice
      showNotification("Microphone access failed.", 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const createNewSession = (keepSidebarOpen = false) => {
    handleStopGeneration();
    
    const newId = generateId();
    setCurrentSessionId(newId);
    setMessages([{
        id: generateId(),
        role: Role.MODEL,
        text: WELCOME_MESSAGE,
        timestamp: new Date(),
    }]);
    shouldAutoScrollRef.current = true;
    if (!keepSidebarOpen) {
        setIsSidebarOpen(false);
    }
  };

  const loadSession = (session: ChatSession) => {
    handleStopGeneration();

    setCurrentSessionId(session.id);
    setMessages(session.messages);
    setRegion(session.region);
    setCountry(session.country);
    shouldAutoScrollRef.current = true;
    setIsSidebarOpen(false);
  };

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    
    if (sessionId === currentSessionId) {
        createNewSession(true);
    }
  };

  const toggleFavorite = (sessionId: string) => {
    setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, isFavorite: !s.isFavorite } : s
    ));
  };

  // Clears EVERYTHING (for Settings modal "Delete All Data")
  const handleClearAllData = () => {
    handleStopGeneration();
    setSessions([]);
    shouldAutoScrollRef.current = true;
    createNewSession(false);
  };

  // HANDLER FOR COMING SOON
  // This replaces entering the main app for now
  const handleStartComingSoon = () => {
      setShowLanding(false);
      setShowPricing(false);
      setShowAbout(false);
      setShowTerms(false);
      setShowPrivacy(false);
      setShowContact(false);
      setShowComingSoon(true);
  };

  // Routing
  if (showComingSoon) return <ComingSoonPage onBack={() => { setShowComingSoon(false); setShowLanding(true); }} />;
  if (showPricing) return <PricingPage onBack={() => setShowPricing(false)} onStart={handleStartComingSoon} />;
  // Removed BlogPage routing
  if (showAbout) return <AboutPage onBack={() => setShowAbout(false)} onStart={handleStartComingSoon} />;
  if (showTerms) return <TermsPage onBack={() => setShowTerms(false)} onStart={handleStartComingSoon} />;
  if (showPrivacy) return <PrivacyPage onBack={() => setShowPrivacy(false)} onStart={handleStartComingSoon} />;
  if (showContact) return <ContactPage onBack={() => setShowContact(false)} onStart={handleStartComingSoon} />;

  if (showLanding) {
    return (
        <LandingPage 
            onStart={handleStartComingSoon} 
            onPricing={() => setShowPricing(true)}
            onBlog={() => { /* Removed Blog Logic */ }}
            onAbout={() => setShowAbout(true)}
            onTerms={() => setShowTerms(true)}
            onPrivacy={() => setShowPrivacy(true)}
            onContact={() => setShowContact(true)}
            onToggleTheme={toggleTheme}
        />
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0B1120] font-sans overflow-hidden transition-colors duration-300">
      <Sidebar 
        region={region}
        setRegion={setRegion}
        country={country}
        setCountry={setCountry}
        voiceLanguage={voiceLanguage}
        setVoiceLanguage={setVoiceLanguage}
        isShortAnswer={isShortAnswer}
        setIsShortAnswer={setIsShortAnswer}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        resetChat={() => createNewSession(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onLoadSession={loadSession}
        onDeleteSession={deleteSession}
        onToggleFavorite={toggleFavorite}
        onOpenSettings={() => { setIsSettingsOpen(true); setIsSidebarOpen(false); }}
        onOpenDictionary={() => { setIsDictionaryOpen(true); setIsSidebarOpen(false); }}
        onBackToLanding={() => setShowLanding(true)}
        onOpenShare={handleOpenShare}
        saveSettings={saveSettings}
        setSaveSettings={setSaveSettings}
      />
      
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onClearHistory={handleClearAllData}
        theme={theme}
        onThemeChange={setTheme}
        region={region}
        setRegion={setRegion}
        country={country}
        setCountry={setCountry}
        fontSize={fontSize}
        setFontSize={setFontSize}
        userName={userName}
        setUserName={setUserName}
        userRole={userRole}
        setUserRole={setUserRole}
      />

      <DictionaryModal 
        isOpen={isDictionaryOpen}
        onClose={() => setIsDictionaryOpen(false)}
        region={region}
        language={voiceLanguage}
      />

      <ShareModal 
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareData={shareData}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in transition-all duration-300 pointer-events-none">
            <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-floating border ${
                notification.type === 'error' 
                ? 'bg-red-50 border-red-100 text-red-800 dark:bg-red-900/90 dark:border-red-900 dark:text-white' 
                : 'bg-slate-800 border-slate-700 text-white shadow-2xl'
            }`}>
                {notification.type === 'error' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 dark:text-red-300">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-medical-400">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                )}
                <span className="text-sm font-medium">{notification.message}</span>
                <button onClick={() => setNotification(null)} className="ml-2 text-current opacity-60 hover:opacity-100">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                </button>
            </div>
        </div>
      )}

      <main className="flex-1 flex flex-col h-full w-full relative isolate">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 h-16 flex items-center px-6 justify-between z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
             >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
             </button>
             
             <div className="flex items-center gap-3 text-sm">
                <button 
                    onClick={() => setShowLanding(true)}
                    className="font-semibold text-slate-800 dark:text-slate-100 hover:text-medical-600 transition-colors flex items-center gap-2"
                >
                    <div className="w-6 h-6 text-medical-600">
                        <Logo className="w-full h-full" />
                    </div>
                    MDnexa™
                </button>
                <span className="text-slate-300 dark:text-slate-700">/</span>
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Guideline Protocol</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[150px] sm:max-w-xs">{country}</span>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
             <div className={`w-2 h-2 rounded-full transition-all duration-500 ${isLoading ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
             <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{isLoading ? 'Processing AI...' : 'System Ready'}</span>
          </div>
        </header>

        {/* Disclaimer Bar */}
        {showDisclaimer && (
        <div className="absolute top-16 left-0 right-0 z-10 bg-blue-50/90 dark:bg-blue-900/20 backdrop-blur-sm border-b border-blue-100 dark:border-blue-900/30 px-4 py-1.5 flex items-center justify-center transition-colors">
            <div className="flex items-center gap-2 text-[10px] md:text-xs font-medium text-blue-800 dark:text-blue-200/90">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 opacity-70">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>
                    <span className="font-bold opacity-90">Educational Use Only:</span> Information provided is not a substitute for professional medical reasoning.
                </span>
            </div>
            <button
                onClick={() => setShowDisclaimer(false)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-full transition-colors"
                title="Dismiss"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
            </button>
        </div>
        )}

        {/* Chat Area */}
        <div 
            className={`flex-1 overflow-y-auto ${showDisclaimer ? 'pt-28' : 'pt-20'} pb-32 px-4 md:px-8 custom-scrollbar`}
            ref={chatContainerRef}
            onScroll={handleScroll}
        >
            <div className="max-w-4xl mx-auto">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} language={voiceLanguage} onShare={handleOpenShare} />
                ))}
                <div ref={messagesEndRef} />
            </div>
        </div>

        {/* Scroll To Bottom */}
        {showScrollBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-36 right-6 md:right-10 z-30 p-2.5 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-medical-50 dark:hover:bg-slate-700 hover:text-medical-600 dark:hover:text-medical-400 transition-all duration-300 animate-fade-in"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        )}

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none bg-gradient-to-t from-white via-white/90 to-transparent dark:from-[#0B1120] dark:via-[#0B1120]/90 h-32 flex items-end justify-center z-20">
            <div className="w-full max-w-4xl relative pointer-events-auto">
                <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-floating border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200 focus-within:ring-2 focus-within:ring-medical-500/20 focus-within:border-medical-500/50">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            isRecording 
                            ? "Listening... Click stop to transcribe." 
                            : isTranscribing 
                              ? "Transcribing audio with Gemini..." 
                              : isShortAnswer 
                                ? `Ask for a concise summary (${country})...` 
                                : `Ask a clinical question based on ${country} standards...`
                        }
                        rows={1}
                        disabled={isLoading || isTranscribing} 
                        className="w-full bg-transparent text-slate-800 dark:text-white text-base pl-5 pr-44 py-4 focus:outline-none resize-none max-h-48 placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-60"
                    />
                    
                    <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                        <button
                            onClick={() => setIsShortAnswer(!isShortAnswer)}
                            disabled={isLoading || isTranscribing}
                            className={`h-9 px-2 md:px-3 rounded-lg transition-all duration-200 flex items-center justify-center group/concise relative text-xs font-bold uppercase tracking-wider ${
                                isShortAnswer 
                                ? 'bg-medical-50 dark:bg-medical-900/30 text-medical-600 dark:text-medical-400' 
                                : 'text-slate-400 hover:text-medical-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                             Short
                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/concise:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                                {isShortAnswer ? "Short Answer: ON" : "Short Answer: OFF"}
                            </span>
                        </button>

                        {isMicSupported && (
                          <>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

                            <div className="relative group">
                                <button
                                    onClick={toggleRecording}
                                    disabled={isLoading || isTranscribing}
                                    className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${
                                        isRecording 
                                        ? 'bg-red-50 text-red-500 shadow-inner' 
                                        : 'text-slate-400 hover:text-medical-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                    title={isRecording ? "Stop Recording" : "Dictate"}
                                >
                                    {isTranscribing ? (
                                        <svg className="animate-spin h-5 w-5 text-medical-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : isRecording ? (
                                        <span className="relative flex h-3 w-3">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                        </span>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                                            <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                                        </svg>
                                    )}
                                </button>
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                    {isRecording ? "Stop & Transcribe" : "Dictate"}
                                </span>
                            </div>
                          </>
                        )}

                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

                        {isLoading ? (
                          <button
                            onClick={handleStopGeneration}
                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                          >
                             <div className="w-3 h-3 bg-current rounded-[2px]"></div>
                          </button>
                        ) : (
                          <button
                            onClick={handleSendMessage}
                            disabled={!input.trim() || isRecording || isTranscribing}
                            className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
                                input.trim() && !isRecording && !isTranscribing
                                ? 'bg-medical-600 text-white hover:bg-medical-700 shadow-md' 
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                            }`}
                          >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                  <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                              </svg>
                          </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;
