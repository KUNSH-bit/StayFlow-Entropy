import { Fragment } from 'react';
import type { ChatMessage as ChatMessageT } from '@/types';

/** Prototype `appendChatMessage` bubble. Text is escaped (React) and AI newlines become <br>, as in the HTML. */
export function ChatMessage({ message }: { message: ChatMessageT }) {
  if (message.sender === 'ai') {
    return (
      <div className="flex items-start space-x-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white text-xs shrink-0 mt-0.5">
          <i className="fa-solid fa-robot"></i>
        </div>
        <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-none p-3 max-w-[88%] shadow-sm text-xs leading-relaxed">
          <p>
            {message.text.split('\n').map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </p>
          <span className="text-[10px] text-gray-400 block mt-1">{message.time}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start space-x-2.5 justify-end">
      <div className="bg-brand-600 text-white rounded-2xl rounded-tr-none p-3 max-w-[88%] shadow-sm text-xs leading-relaxed">
        <p>{message.text}</p>
        <span className="text-[10px] text-brand-200 block mt-1 text-right">{message.time}</span>
      </div>
    </div>
  );
}
