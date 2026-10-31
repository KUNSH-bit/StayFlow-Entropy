import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './index.css';
import { HotelProvider } from '@/store/HotelStore';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HotelProvider>
      <App />
    </HotelProvider>
  </StrictMode>,
);
