import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Bell, AlertCircle, DollarSign, CalendarPlus, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import PageTransition from '../shared/PageTransition';
import UnifiedBottomNav from './UnifiedBottomNav';
import Footer from '../shared/Footer';

const ROOT_PATHS = ['/staff', '/staff/bisogni', '/staff/crea-evento', '/staff/affitti', '/staff/profilo'];
const navItems = [
  { path: '/staff', label: 'Dashboard', icon: Bell, section: 'dashboard' },
  { path: '/staff/bisogni', label: 'Bisogni', icon: AlertCircle, section: 'bisogni' },
  { path: '/staff/crea-evento', label: 'Evento', icon: CalendarPlus, section: 'evento' },
  { path: '/staff/affitti', label: 'Affitti', icon: DollarSign, section: 'affitti' },
  { path: '/staff/profilo', label: 'Profilo', icon: User, section: 'profilo' },
];

export default function StaffLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [marketConfirmed, setMarketConfirmed] = useState(null);
  const [openNeedsCount, setOpenNeedsCount] = useState(0);
  const [stacks, setStacks] = useState({
    dashboard: ['/staff'],
    bisogni: ['/staff/bisogni'],
    evento: ['/staff/crea-evento'],
    affitti: ['/staff/affitti'],
    profilo: ['/staff/profilo'],
  });

  useEffect(() => {
    base44.auth.me().then(async (me) => {
      const staff = await base44.entities.StaffMember.filter({ email: me.email }, '-updated_date', 1);
      setMarketConfirmed(staff.length > 0 && staff[0].market_confirmed === true);
    }).catch(() => setMarketConfirmed(false));
  }, []);

  useEffect(() => {
    if (marketConfirmed !== true) return;
    base44.entities.CompanyNeed.filter({ status: 'open' }, '-updated_date', 100)
      .then(needs => setOpenNeedsCount(needs.length))
      .catch(() => {});
  }, [marketConfirmed]);

  useEffect(() => {
    const section = navItems.find(n => location.pathname === n.path)?.section || 'dashboard';
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
      const section = navItems.find(n => location.pathname === n.path || location.pathname.startsWith(n.path + '/'))?.section || 'dashboard';
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

  if (marketConfirmed === null) return null;
  if (marketConfirmed === false) return <Navigate to="/staff-onboarding" replace />;

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