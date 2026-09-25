import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Home, Package, Sparkles, ShoppingBag, Building2, FileText } from 'lucide-react';
import PageTransition from '../shared/PageTransition';
import UnifiedBottomNav from './UnifiedBottomNav';
import Footer from '../shared/Footer';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { getMyCompany } from '@/api/companies';
import { haAncoraDdtDaFareOggi } from '@/api/ddt';
import { ListinoAiProvider, useListinoAi } from '@/lib/ListinoAiContext';
import { supabase } from '@/api/client';

const ROOT_PATHS = ['/produttore', '/produttore/prodotti', '/produttore/ddt', '/produttore/ordini', '/produttore/azienda'];

// Elenco completo, usato per riconoscere a quale sezione appartiene un
// percorso (stack, tasto indietro): il DDT resta una sezione valida
// anche quando il suo tab è nascosto dalla bottom bar, perché la
// pagina è comunque raggiungibile dal pulsante dentro "Prodotti".
const navItems = [
  { path: '/produttore', label: 'Home', icon: Home, section: 'home' },
  { path: '/produttore/prodotti', label: 'Prodotti', icon: Package, section: 'prodotti' },
  { path: '/produttore/ddt', label: 'DDT', icon: FileText, section: 'ddt' },
  { path: '/produttore/ordini', label: 'Ordini', icon: ShoppingBag, section: 'ordini' },
  { path: '/produttore/azienda', label: 'Azienda', icon: Building2, section: 'azienda' },
];

// Quando l'analisi Listino AI passa da "analyzing" a "done", riporta il
// produttore su Prodotti a mostrare il catalogo appena caricato —
// da qualunque schermata si trovasse mentre l'AI lavorava.
function ListinoAiCompletionWatcher() {
  const { status } = useListinoAi();
  const navigate = useNavigate();
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current === 'analyzing' && status === 'done') {
      navigate('/produttore/prodotti');
    }
    prevStatus.current = status;
  }, [status, navigate]);
  return null;
}

export default function ProducerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stacks, setStacks] = useState({
    home: ['/produttore'],
    prodotti: ['/produttore/prodotti'],
    ddt: ['/produttore/ddt'],
    ordini: ['/produttore/ordini'],
    azienda: ['/produttore/azienda'],
  });

  const { data: myCompany } = useQuery({
    queryKey: ['my-company', user?.email],
    queryFn: getMyCompany,
    enabled: !!user?.email,
  });

  // Finché non sappiamo, mostriamo il tab (default prudente: meglio
  // visibile di troppo che nascosto per errore). Sparisce solo quando
  // la verifica conferma che oggi non c'è più nulla da fare.
  const { data: haDdtDaFare = true } = useQuery({
    queryKey: ['ddt-da-fare-oggi', myCompany?.id],
    queryFn: () => haAncoraDdtDaFareOggi(myCompany.id, myCompany.market_ids || []),
    enabled: !!myCompany?.id,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: ordiniInAttesa = 0 } = useQuery({
    queryKey: ['ordini-in-attesa-count', myCompany?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('orders').select('id', { count: 'exact', head: true })
        .eq('company_id', myCompany.id).eq('status', 'in_attesa');
      return count ?? 0;
    },
    enabled: !!myCompany?.id,
    refetchInterval: 60 * 1000, // ogni minuto: gli ordini nuovi devono comparire senza aspettare troppo
  });

  const visibleNavItems = useMemo(() => {
    const base = haDdtDaFare ? navItems : navItems.filter((n) => n.section !== 'ddt');
    return base.map((n) => n.section === 'ordini' ? { ...n, badge: ordiniInAttesa } : n);
  }, [haDdtDaFare, ordiniInAttesa]);

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
    <ListinoAiProvider>
      <ListinoAiCompletionWatcher />
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 overflow-y-auto pb-20">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
          <Footer />
        </div>
        <UnifiedBottomNav navItems={visibleNavItems} stacks={stacks} setStacks={setStacks} />
      </div>
    </ListinoAiProvider>
  );
}