import { useHotel } from '@/store/HotelStore';

const STAFF_CHIPS = ['📧 Parse booking email', '🏨 Available suites?', '📋 Hotel Policies'];

/** Prototype `#chat-suggestion-chips` (built by `setupChatForRole`). Empty until login. */
export function SuggestionChips() {
  const { chatRole, currentSession, simulateInboundEmail, sendChip } = useHotel();
  const canImportEmail = ['OWNER', 'MANAGER', 'FRONT_DESK'].includes(currentSession?.membershipRole ?? '');
  const chips = chatRole === 'employee' ? STAFF_CHIPS.filter((chip) => canImportEmail || !chip.includes('Parse booking email')) : [];
  return (
    <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-gray-100 dark:border-gray-700/50">
      {chips.map((chipText) => (
        <button
          key={chipText}
          type="button"
          onClick={() => (chipText.includes('Parse booking email') ? simulateInboundEmail() : sendChip(chipText))}
          className="suggestion-chip shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-brand-50 hover:text-brand-600 transition-colors border border-gray-200 dark:border-gray-600"
        >
          {chipText}
        </button>
      ))}
    </div>
  );
}
