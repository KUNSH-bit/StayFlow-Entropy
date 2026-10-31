import { useHotel } from '@/store/HotelStore';
import { LoginScreen } from '@/components/LoginScreen';
import { Header } from '@/components/Header';
import { DrawerOverlay } from '@/components/DrawerOverlay';
import { NavSidebar } from '@/components/NavSidebar';
import { StaffLeftColumn } from '@/components/staff/StaffLeftColumn';
import { OverviewTab } from '@/components/tabs/OverviewTab';
import { RoomsTab } from '@/components/tabs/RoomsTab';
import { HousekeepingTab } from '@/components/tabs/HousekeepingTab';
import { StaffTab } from '@/components/tabs/StaffTab';
import { BillingTab } from '@/components/tabs/BillingTab';
import { BookingsTab } from '@/components/tabs/BookingsTab';
import { GuestsTab } from '@/components/tabs/GuestsTab';
import { ReportsTab } from '@/components/tabs/ReportsTab';
import { AiChatSidebar } from '@/components/chat/AiChatSidebar';
import { BookingModal } from '@/components/BookingModal';
import { ToastContainer } from '@/components/ToastContainer';

/** Page layout of grand_horizon_hotel_hms_guest_portal.html, one component per section. */
export function App() {
  const { currentTab, currentSession, activeHotelId, isInitializing } = useHotel();

  if (isInitializing) {
    return <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-sm text-gray-500">Connecting to StayFlow…</div>;
  }
  if (!currentSession) return <LoginScreen />;

  return (
    <>
      {/* 2. APP TOP HEADER BAR */}
      <Header />

      {/* Main App Container */}
      <div key={activeHotelId ?? 'none'} className="flex-1 flex overflow-hidden relative">
        <DrawerOverlay />
        <NavSidebar />

        {/* 3. MAIN WORKSPACE CONTENT */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 gap-4 bg-gray-50 dark:bg-gray-900">
          <StaffLeftColumn />

          {/* Dynamic Workspace View Container (Employees & Guests) */}
          <div className="flex-1 flex flex-col gap-3 h-full overflow-hidden">
            {currentTab === 'overview' && <OverviewTab />}
            {currentTab === 'rooms' && <RoomsTab />}
            {currentTab === 'housekeeping' && <HousekeepingTab />}
            {currentTab === 'staff' && <StaffTab />}
            {currentTab === 'billing' && <BillingTab />}
            {currentTab === 'bookings' && <BookingsTab />}
            {currentTab === 'guests' && <GuestsTab />}
            {currentTab === 'reports' && <ReportsTab />}
          </div>
        </main>

        <AiChatSidebar />
      </div>

      <BookingModal />
      <ToastContainer />
    </>
  );
}
