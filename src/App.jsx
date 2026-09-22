import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AnimatePresence } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from './components/layout/AppLayout';
import ProducerLayout from './components/layout/ProducerLayout.jsx';
import StaffLayout from './components/layout/StaffLayout.jsx';
import PageTransition from './components/shared/PageTransition';
import RoleSelect from './pages/RoleSelect';
import Login from './pages/Login';
import ErrorBoundary from './components/shared/ErrorBoundary';
import AdminLayout from '@/components/layout/AdminLayout';
import DirezioneLayout from '@/components/layout/DirezioneLayout';
import StaffMarketOnboarding from './pages/staff/StaffMarketOnboarding.jsx';

// Lazy load pages
const Home = lazy(() => import('./pages/Home.jsx'));
const ProducerHome = lazy(() => import('./pages/producer/ProducerHome.jsx'));
const ProducerOnboarding = lazy(() => import('./pages/producer/ProducerOnboarding.jsx'));
const ProducerProducts = lazy(() => import('./pages/producer/ProducerProducts.jsx'));
const ProducerListinoAI = lazy(() => import('./pages/producer/ProducerListinoAI.jsx'));
const ProducerOrders = lazy(() => import('./pages/producer/ProducerOrders.jsx'));
const ProducerCompany = lazy(() => import('./pages/producer/ProducerCompany.jsx'));
const ProducerInventory = lazy(() => import('./pages/producer/ProducerInventory.jsx'));
const ProducerMarkets = lazy(() => import('./pages/producer/ProducerMarkets.jsx'));
const ProducerSuppliers = lazy(() => import('./pages/producer/ProducerSuppliers.jsx'));
const ProducerDDT = lazy(() => import('./pages/producer/ProducerDDT.jsx'));
const StaffDashboard = lazy(() => import('./pages/staff/StaffDashboard.jsx'));
const StaffProfile = lazy(() => import('./pages/staff/StaffProfile.jsx'));
const StaffMembers = lazy(() => import('./pages/staff/StaffMembers.jsx'));
const StallRentals = lazy(() => import('./pages/staff/StallRentals.jsx'));
const CompanyNeeds = lazy(() => import('./pages/staff/CompanyNeeds.jsx'));
const AbsenceCalendar = lazy(() => import('./pages/staff/AbsenceCalendar.jsx'));
const CreateEvent = lazy(() => import('./pages/staff/CreateEvent.jsx'));
const StaffDDT = lazy(() => import('./pages/staff/StaffDDT.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const AdminDDT = lazy(() => import('./pages/admin/AdminDDT.jsx'));
const AdminAndamento = lazy(() => import('./pages/admin/AdminAndamento.jsx'));
const DirezioneAffitti = lazy(() => import('./pages/direzione/DirezioneAffitti.jsx'));
const DirezioneProblemi = lazy(() => import('./pages/direzione/DirezioneProblemi.jsx'));
const Companies = lazy(() => import('./pages/Companies'));
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'));
const Markets = lazy(() => import('./pages/Markets'));
const MarketDetail = lazy(() => import('./pages/MarketDetail'));
const Favorites = lazy(() => import('./pages/Favorites.jsx'));
const Orders = lazy(() => import('./pages/Orders'));
const News = lazy(() => import('./pages/News'));
const Stagionalita = lazy(() => import('./pages/Stagionalita.jsx'));
const ClientProfile = lazy(() => import('./pages/ClientProfile.jsx'));
const AdminSyncMarkets = lazy(() => import('./pages/AdminSyncMarkets.jsx'));
const ProducerResellers = lazy(() => import('./pages/producer/ProducerResellers.jsx'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, user, isAuthenticated } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Non autenticato: si mostra la schermata di accesso.
  if (!isAuthenticated || !user) {
    return <Login />;
  }

  if (authError && authError.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Gate: if user is authenticated, force /benvenuto if role_confirmed is false or missing
  const needsOnboarding = user && !user.role_confirmed && user.role !== 'admin' && user.role !== 'direzione';

  // Determine home route based on role
  const roleHome = user?.role === 'admin' ? '/admin'
    : user?.role === 'direzione' ? '/direzione'
    : user?.role === 'producer' ? '/produttore'
    : user?.role === 'staff' ? '/staff'
    : '/home';

  // Render the main app
  return (
    <ErrorBoundary>
    <AnimatePresence mode="wait">
      <Routes>
      {/* Force to role selection if role not confirmed */}
      <Route path="/" element={needsOnboarding ? <Navigate to="/benvenuto" replace /> : <Navigate to={roleHome} replace />} />
      <Route path="/benvenuto" element={<RoleSelect />} />
      <Route path="/staff-onboarding" element={<StaffMarketOnboarding />} />
      {needsOnboarding && <Route path="*" element={<Navigate to="/benvenuto" replace />} />}
      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense>} />
        <Route path="/admin/ddt" element={<Suspense fallback={<PageLoader />}><AdminDDT /></Suspense>} />
        <Route path="/admin/andamento" element={<Suspense fallback={<PageLoader />}><AdminAndamento /></Suspense>} />
      </Route>
      <Route element={<DirezioneLayout />}>
        <Route path="/direzione" element={<Navigate to="/direzione/affitti" replace />} />
        <Route path="/direzione/affitti" element={<Suspense fallback={<PageLoader />}><DirezioneAffitti /></Suspense>} />
        <Route path="/direzione/problemi" element={<Suspense fallback={<PageLoader />}><DirezioneProblemi /></Suspense>} />
      </Route>
      <Route element={<AppLayout />}>
        <Route path="/home" element={<Suspense fallback={<PageLoader />}><Home /></Suspense>} />
        <Route path="/aziende" element={<Suspense fallback={<PageLoader />}><Companies /></Suspense>} />
        <Route path="/aziende/:id" element={<Suspense fallback={<PageLoader />}><CompanyDetail /></Suspense>} />
        <Route path="/mercati" element={<Suspense fallback={<PageLoader />}><Markets /></Suspense>} />
        <Route path="/mercati/:id" element={<Suspense fallback={<PageLoader />}><MarketDetail /></Suspense>} />
        <Route path="/preferiti" element={<Suspense fallback={<PageLoader />}><Favorites /></Suspense>} />
        <Route path="/ordini" element={<Suspense fallback={<PageLoader />}><Orders /></Suspense>} />
        <Route path="/notizie" element={<Suspense fallback={<PageLoader />}><News /></Suspense>} />
        <Route path="/stagionalita" element={<Suspense fallback={<PageLoader />}><Stagionalita /></Suspense>} />
        <Route path="/profilo" element={<Suspense fallback={<PageLoader />}><ClientProfile /></Suspense>} />
        <Route path="/admin/sync-markets" element={<Suspense fallback={<PageLoader />}><AdminSyncMarkets /></Suspense>} />
        <Route path="*" element={<PageNotFound />} />
      </Route>
      <Route element={<ProducerLayout />}>
        <Route path="/produttore" element={<Suspense fallback={<PageLoader />}><ProducerHome /></Suspense>} />
        <Route path="/produttore/onboarding" element={<Suspense fallback={<PageLoader />}><ProducerOnboarding /></Suspense>} />
        <Route path="/produttore/prodotti" element={<Suspense fallback={<PageLoader />}><ProducerProducts /></Suspense>} />
        <Route path="/produttore/listino-ai" element={<Suspense fallback={<PageLoader />}><ProducerListinoAI /></Suspense>} />
        <Route path="/produttore/ordini" element={<Suspense fallback={<PageLoader />}><ProducerOrders /></Suspense>} />
        <Route path="/produttore/disponibilita" element={<Suspense fallback={<PageLoader />}><ProducerInventory /></Suspense>} />
        <Route path="/produttore/mercati" element={<Suspense fallback={<PageLoader />}><ProducerMarkets /></Suspense>} />
        <Route path="/produttore/azienda" element={<Suspense fallback={<PageLoader />}><ProducerCompany /></Suspense>} />
        <Route path="/produttore/fornitori" element={<Suspense fallback={<PageLoader />}><ProducerSuppliers /></Suspense>} />
        <Route path="/produttore/ddt" element={<Suspense fallback={<PageLoader />}><ProducerDDT /></Suspense>} />
        <Route path="/produttore/rivenditori" element={<Suspense fallback={<PageLoader />}><ProducerResellers /></Suspense>} />
      </Route>
      <Route element={<StaffLayout />}>
        <Route path="/staff" element={<Suspense fallback={<PageLoader />}><StaffDashboard /></Suspense>} />
        <Route path="/staff/team" element={<Suspense fallback={<PageLoader />}><StaffMembers /></Suspense>} />
        <Route path="/staff/affitti" element={<Suspense fallback={<PageLoader />}><StallRentals /></Suspense>} />
        <Route path="/staff/bisogni" element={<Suspense fallback={<PageLoader />}><CompanyNeeds /></Suspense>} />
        <Route path="/staff/crea-evento" element={<Suspense fallback={<PageLoader />}><CreateEvent /></Suspense>} />
        <Route path="/staff/profilo" element={<Suspense fallback={<PageLoader />}><StaffProfile /></Suspense>} />
        <Route path="/staff/assenze" element={<Suspense fallback={<PageLoader />}><AbsenceCalendar /></Suspense>} />
        <Route path="/staff/ddt" element={<Suspense fallback={<PageLoader />}><StaffDDT /></Suspense>} />
      </Route>
    </Routes>
    </AnimatePresence>
    </ErrorBoundary>
  );
};


const ResellerAccess = lazy(() => import('./pages/reseller/ResellerAccess.jsx'));

function App() {

  return (
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <Routes>
              {/* Pubbliche: nessun account richiesto, solo una password */}
              <Route path="/rivenditore/:companyId" element={<Suspense fallback={<PageLoader />}><ResellerAccess /></Suspense>} />
              <Route path="*" element={<AuthenticatedApp />} />
            </Routes>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App