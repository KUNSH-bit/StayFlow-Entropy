import { useHotel } from '@/store/HotelStore';

/** Prototype `#toast-container` + `showToast`. */
export function ToastContainer() {
  const { toasts } = useHotel();
  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center space-x-2 transition-all transform${t.visible ? '' : ' translate-y-2 opacity-0'}`}
        >
          <i className="fa-solid fa-circle-check text-emerald-400 dark:text-emerald-600"></i> <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
