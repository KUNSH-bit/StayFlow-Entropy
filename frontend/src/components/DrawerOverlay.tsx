import { useHotel } from '@/store/HotelStore';

/** Prototype `#drawer-overlay` (Overlay for Mobile Menu / Chat). */
export function DrawerOverlay() {
  const { overlayHidden, overlayTransparent, overlayClick } = useHotel();
  return (
    <div
      onClick={overlayClick}
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40${overlayHidden ? ' hidden' : ''}${overlayTransparent ? ' opacity-0' : ''} transition-opacity duration-300`}
    ></div>
  );
}
