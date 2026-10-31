import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useHotel } from '@/store/HotelStore';
import { ChatMessage } from './ChatMessage';
import { SuggestionChips } from './SuggestionChips';

/** Prototype `#ai-chat-sidebar` (Right Sidebar: Dynamic AI Chatbot Assistant). */
export function AiChatSidebar() {
  const { chatMessages, chatOpen, closeChatMobile, sendChatMessage, setupChatForRole, currentSession } = useHotel();
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // chatContainer.scrollTop = chatContainer.scrollHeight
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [chatMessages]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendChatMessage(text);
  };

  const title = 'Read-only Hotel Operations Assistant';
  const subtitle = 'Answers from this hotel’s operational data';

  return (
    <aside
      className={`w-full lg:w-80 xl:w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full fixed lg:relative right-0 top-0 bottom-0 z-30 transform lg:transform-none${chatOpen ? '' : ' translate-x-full'} lg:translate-x-0 transition-transform duration-300 shadow-xl lg:shadow-none`}
    >
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/80">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow">
              <i className="fa-solid fa-robot"></i>
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h2 className="font-bold text-sm text-gray-900 dark:text-white">{title}</h2>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300 rounded">AI Active</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => setupChatForRole(currentSession ? currentSession.role : 'employee')}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors"
            title="Clear Chat"
          >
            <i className="fa-solid fa-rotate-right text-xs"></i>
          </button>
          <button type="button" onClick={closeChatMobile} className="lg:hidden p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500 transition-colors" aria-label="Close chat">
            <i className="fa-solid fa-xmark text-sm"></i>
          </button>
        </div>
      </div>

      {/* Chat Message Container */}
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {chatMessages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
      </div>

      {/* Quick Suggestion Chips */}
      <SuggestionChips />

      {/* Chat Input Area */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <form onSubmit={onSubmit} className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-100 dark:bg-gray-700/70 rounded-xl flex items-center px-3 py-1.5 border border-transparent focus-within:border-brand-500 focus-within:bg-white dark:focus-within:bg-gray-700 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI assistant..."
              aria-label="Ask AI assistant"
              className="w-full bg-transparent border-none outline-none text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
          <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0" aria-label="Send">
            <i className="fa-solid fa-paper-plane text-xs"></i>
          </button>
        </form>
      </div>
    </aside>
  );
}
