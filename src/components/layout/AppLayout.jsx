import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Building2, MapPin, Heart, Sprout } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '../shared/PageTransition';
import UnifiedBottomNav from './UnifiedBottomNav';
import Footer from '../shared/Footer';

const navItems = [
  { path: '/home', label: 'Home', icon: Home, section: 'home' },
  { path: '/aziende', label: 'Aziende', icon: Building2, section: 'aziende' },
  { path: '/mercati', label: 'Mercati', icon: MapPin, section: 'mercati' },
  { path: '/preferiti', label: 'Preferiti', icon: Heart, section: 'preferiti' },
  { path: '/stagionalita', label: 'Stagioni', icon: Sprout, section: 'stagionalita' },
];

const ROOT_PATHS = ['/home', '/aziende', '/mercati', '/preferiti', '/stagionalita', '/ordini', '/notizie'];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [stacks, setStacks] = useState({
    home: ['/home'],
    aziende: ['/aziende'],
    mercati: ['/mercati'],
    preferiti: ['/preferiti'],
    stagionalita: ['/stagionalita'],
    ordini: ['/ordini'],
    notizie: ['/notizie'],
  });

  useEffect(() => {
    const section = ROOT_PATHS.find(p => location.pathname.startsWith(p))?.slice(1) || 'home';
    if (ROOT_PATHS.includes(location.pathname)) {
      setStacks(prev => ({
        ...prev,
        [section]: [location.pathname],
      }));
    } else {
      setStacks(prev => ({
        ...prev,
        [section]: [...new Set([...prev[section], location.pathname])],
      }));
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleBackPress = () => {
      const section = ROOT_PATHS.find(p => location.pathname.startsWith(p))?.slice(1) || 'home';
      setStacks(prev => {
        const currentStack = prev[section];
        if (currentStack.length > 1) {
          const newStack = currentStack.slice(0, -1);
          navigate(newStack[newStack.length - 1]);
          return { ...prev, [section]: newStack };
        }
        return prev;
      });
    };

    window.addEventListener('hardwareBackPress', handleBackPress);
    return () => window.removeEventListener('hardwareBackPress', handleBackPress);
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
        <Footer />
      </main>
      <UnifiedBottomNav navItems={navItems} stacks={stacks} setStacks={setStacks} />
    </div>
  );
}