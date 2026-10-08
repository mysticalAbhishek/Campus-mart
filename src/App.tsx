import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './lib/store';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import { Toasts } from './components/ui';
import Home from './pages/Home';
import Market from './pages/Market';
import Auctions from './pages/Auctions';
import CoinsPage from './pages/CoinsPage';
import Shop from './pages/Shop';
import Leaderboard from './pages/Leaderboard';
import Dashboard from './pages/Dashboard';
import Sell from './pages/Sell';
import Admin from './pages/Admin';

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/market" element={<Market />} />
              <Route path="/auctions" element={<Auctions />} />
              <Route path="/coins" element={<CoinsPage />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/sell" element={<Sell />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <AuthModal />
          <Toasts />
        </div>
      </BrowserRouter>
    </StoreProvider>
  );
}
