import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Home, Package, Sparkles, ShoppingBag, Building2, FileText } from 'lucide-react';
import PageTransition from '../shared/PageTransition';
import UnifiedBottomNav from './UnifiedBottomNav';
import Footer from '../shared/Footer';
import { cn } from '@/lib/utils';

const ROOT_PATHS = ['/produttore', '/produttore/prodotti', '/produttore/ddt', '/produttore/ordini', '/produttore/azienda'];
const navItems = [
  { path: '/produttore', label: 'Home', icon: Home, section: 'home' },
  { path: '/produttore/prodotti', label: 'Prodotti', icon: Package, section: 'prodotti' },
  { path: '/produttore/ddt', label: 'DDT', icon: FileText, section: 'ddt' },
  { path: '/produttore/ordini', label: 'Ordini', icon: ShoppingBag, section: 'ordini' },
  { path: '/produttore/azienda', label: 'Azienda', icon: Building2, section: 'azienda' },
];

export default function ProducerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [stacks, setStacks] = useState({
    home: ['/produttore'],
    prodotti: ['/produttore/prodotti'],
    ddt: ['/produttore/ddt'],
    ordini: ['/produttore/ordini'],
    azienda: ['/produttore/azienda'],
  });

  useEffect(() => {
    const section = navItems.find(n => location.pathname === n.path)?.section || 'home';
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
      const section = navItems.find(n => location.pathname === n.path || location.pathname.startsWith(n.path + '/'))?.section || 'home';
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

  const handleNavClick = (item) => {
    const currentSection = navItems.find(n => location.pathname === n.path || location.pathname.startsWith(n.path + '/'))?.section;
    
    if (item.section === currentSection && location.pathname === item.path) {
      setStacks(prev => ({
        ...prev,
        [item.section]: [item.path],
      }));
    } else {
      setStacks(prev => ({
        ...prev,
        [item.section]: [item.path],
      }));
      navigate(item.path);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
        <Footer />
      </div>
      <UnifiedBottomNav navItems={navItems} stacks={stacks} setStacks={setStacks} />
    </div>
  );
}