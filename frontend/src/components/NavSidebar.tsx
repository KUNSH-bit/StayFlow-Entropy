import { useHotel } from '@/store/HotelStore';
import type { TabId } from '@/types';

const ACTIVE = 'nav-tab-btn active w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300 font-semibold text-sm';
const INACTIVE = 'nav-tab-btn w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors';

const TABS: { tab: TabId; icon: string; label: string }[] = [
  { tab: 'overview', icon: 'fa-chart-line', label: 'Dashboard & Analytics' },
  { tab: 'rooms', icon: 'fa-bed', label: 'Room Management' },
  { tab: 'bookings', icon: 'fa-book-bookmark', label: 'Reservations & Calendar' },
  { tab: 'guests', icon: 'fa-users', label: 'Guests & Requests' },
  { tab: 'reports', icon: 'fa-chart-column', label: 'Revenue & Occupancy' },
  { tab: 'housekeeping', icon: 'fa-broom', label: 'Housekeeping Tasks' },
  { tab: 'staff', icon: 'fa-user-gear', label: 'Staff & Shifts' },
  { tab: 'billing', icon: 'fa-receipt', label: 'Invoices & Payments' },
];

/** Prototype `#nav-sidebar` (Left Navigation Drawer, incl. the Sync Status card). */
export function NavSidebar() {
  const { sidebarOpen, closeDrawer, currentTab, switchTab, currentSession, dataLoading } = useHotel();
  return (
    <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 transform${sidebarOpen ? '' : ' -translate-x-full'} sidebar-transition flex flex-col shadow-2xl`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
            <i className="fa-solid fa-hotel text-sm"></i>
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white">StayFlow</span>
        </div>
        <button type="button" onClick={closeDrawer} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" aria-label="Close menu">
          <i className="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      {/* Sidebar Navigation Links */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {TABS.map((t) => (
          <button
            key={t.tab}
            type="button"
            onClick={() => {
              switchTab(t.tab);
              closeDrawer();
            }}
            className={currentTab === t.tab ? ACTIVE : INACTIVE}
          >
            <i className={`fa-solid ${t.icon} text-base`}></i>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="p-3 m-3 bg-gray-100 dark:bg-gray-700/60 rounded-xl border border-gray-200 dark:border-gray-600 text-xs">
        <div className="flex items-center justify-between font-semibold text-gray-700 dark:text-gray-200 mb-1">
          <span className="flex items-center gap-1"><i className="fa-solid fa-database text-blue-500"></i> Workspace</span>
          <span className={`w-2 h-2 rounded-full ${dataLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{currentSession?.hotelName} · {dataLoading ? 'Refreshing data…' : 'Bypass Demo Active'}</p>
      </div>
    </aside>
  );
}
