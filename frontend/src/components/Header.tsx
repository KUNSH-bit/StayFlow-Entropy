import { useHotel } from '@/store/HotelStore';

export function Header() {
  const { profile, memberships, activeHotelId, selectHotel, isDark, toggleTheme, openDrawer, openChatMobile, simulateInboundEmail, logoutSession } = useHotel();
  const canImportEmail = ['OWNER', 'MANAGER', 'FRONT_DESK'].includes(profile?.membershipRole ?? '');

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between z-30 shrink-0 shadow-sm">
      <div className="flex items-center space-x-3 min-w-0">
        <button type="button" onClick={openDrawer} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" aria-label="Open navigation menu"><i className="fa-solid fa-bars text-xl"></i></button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-brand-600 flex items-center justify-center text-white shadow-md shrink-0"><i className="fa-solid fa-hotel text-lg"></i></div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-base sm:text-lg tracking-tight text-gray-900 dark:text-white truncate">{profile?.hotelName ?? 'StayFlow'}</span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">{profile?.title ?? 'Hotel team'}</span>
        </div>
        {memberships.length > 1 && (
          <select aria-label="Select hotel" value={activeHotelId ?? ''} onChange={(event) => void selectHotel(event.target.value)} className="ml-2 max-w-40 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5">
            {memberships.map((membership) => <option key={membership.hotelId} value={membership.hotelId}>{membership.hotelName}</option>)}
          </select>
        )}
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {canImportEmail && <button type="button" onClick={simulateInboundEmail} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700/50 hover:bg-indigo-100 text-xs font-semibold transition-all" title="Import a booking email for extraction and staff review">
          <i className="fa-solid fa-envelope-open-text"></i><span>Import email</span>
        </button>}
        <button type="button" onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300" title="Toggle theme"><i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'} text-lg`}></i></button>
        <button type="button" onClick={openChatMobile} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-brand-600 dark:text-brand-400" title="Open read-only assistant"><i className="fa-solid fa-robot text-lg"></i></button>
        <div className="pl-2 border-l border-gray-200 dark:border-gray-700 flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-200 font-bold text-sm flex items-center justify-center">{profile?.name.slice(0, 1).toUpperCase()}</div>
          <div className="hidden sm:flex flex-col max-w-40">
            <span className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{profile?.name}</span>
            <span className="text-[10px] text-gray-400">{profile?.membershipRole.replace(/_/g, ' ')}</span>
          </div>
          <button type="button" onClick={() => void logoutSession()} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400" title="Sign out" aria-label="Sign out"><i className="fa-solid fa-right-from-bracket text-base"></i></button>
        </div>
      </div>
    </header>
  );
}
