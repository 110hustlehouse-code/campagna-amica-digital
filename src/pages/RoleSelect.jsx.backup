import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, ShoppingBasket, ChevronRight, X, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const PRODUCER_ACCESS_CODE = 'CAMPAGNA2025';
const STAFF_ACCESS_CODE = 'COLDIRETTI2025';

export default function RoleSelect() {
  const navigate = useNavigate();
  const { refreshUser, isAuthenticated, user, navigateToLogin, isLoadingAuth } = useAuth();
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeType, setCodeType] = useState(null);
  const [loading, setLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoadingAuth && (!isAuthenticated || !user)) {
      navigateToLogin();
    }
  }, [isLoadingAuth, isAuthenticated, user, navigateToLogin]);

  // Se ancora in caricamento, mostra spinner
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #004d26 0%, #006633 50%, #00802b 100%)' }}>
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  // Se non autenticato, loading per il redirect
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #004d26 0%, #006633 50%, #00802b 100%)' }}>
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  const handleProducerClick = () => {
    setShowCodeModal(true);
    setCodeInput('');
    setCodeError('');
    setCodeType('producer');
  };

  const handleStaffClick = () => {
    setShowCodeModal(true);
    setCodeInput('');
    setCodeError('');
    setCodeType('staff');
  };

  const handleClientClick = async () => {
    try {
      setLoading(true);
      await base44.auth.updateMe({ role: 'client', role_confirmed: true });
      await refreshUser();
      navigate('/home');
    } catch (error) {
      console.error('Error setting role:', error);
      setLoading(false);
    }
  };

  const handleCodeSubmit = async () => {
    try {
      const trimmed = codeInput.trim();
      if (codeType === 'producer' && trimmed === PRODUCER_ACCESS_CODE) {
        setLoading(true);
        await base44.auth.updateMe({ role: 'producer', role_confirmed: true });
        await refreshUser();
        navigate('/produttore/onboarding');
      } else if (codeType === 'staff' && trimmed === STAFF_ACCESS_CODE) {
        setLoading(true);
        await base44.auth.updateMe({ role: 'staff', role_confirmed: true });
        await refreshUser();
        navigate('/staff-onboarding');
      } else {
        setCodeError('Codice non valido');
        setCodeInput('');
      }
    } catch (error) {
      console.error('Error in code submission:', error);
      setCodeError('Errore nella verifica del codice');
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCodeSubmit();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #004d26 0%, #006633 50%, #00802b 100%)' }}>
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #004d26 0%, #006633 50%, #00802b 100%)' }}>

      {/* Hero top */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-72 h-72 rounded-full opacity-10" style={{ background: '#f5c518' }} />
        <div className="absolute bottom-[-40px] left-[-60px] w-52 h-52 rounded-full opacity-10" style={{ background: '#f5c518' }} />

        {/* Loghi ufficiali */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <img
            src="https://media.base44.com/images/public/69cd578540390a850769aa6d/570bdc5f1_cropped-coldiretti-vector-logo.png"
            alt="Coldiretti"
            className="h-16 w-auto drop-shadow-lg"
          />
          <div className="w-px h-10 bg-white/25" />
          <img
            src="https://media.base44.com/images/public/69cd578540390a850769aa6d/ce1586586_images.jpeg"
            alt="Campagna Amica"
            className="h-16 w-auto rounded-xl drop-shadow-lg"
          />
        </div>

        <div className="text-center mb-2">
          <h1 className="font-heading text-4xl font-bold text-white leading-tight">Campagna Amica</h1>
          <p className="text-white/70 mt-3 text-sm max-w-xs mx-auto leading-relaxed">
            Il mercato degli agricoltori italiani. Prodotti freschi, stagionali, a chilometro zero.
          </p>
        </div>

        {/* decorative divider */}
        <div className="flex items-center gap-3 my-8 w-full max-w-xs">
          <div className="flex-1 h-px bg-white/20" />
          <span className="text-white/40 text-xs">scegli il tuo profilo</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-4 w-full max-w-sm px-4 sm:px-0">
          {/* Cliente */}
          <button
            onClick={handleClientClick}
            className="group flex items-center gap-5 p-4 sm:p-5 rounded-2xl text-left transition-all duration-200 active:scale-95 min-h-20 sm:min-h-24 touch-action-none"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
            type="button"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,197,24,0.25)' }}>
              <ShoppingBasket className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: '#f5c518' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-heading text-base sm:text-lg font-bold text-white">Sono un cliente</div>
              <div className="text-white/60 text-xs mt-0.5">Scopri mercati, aziende e prodotti locali</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors flex-shrink-0" />
          </button>

          {/* Produttore */}
          <button
            onClick={handleProducerClick}
            className="group flex items-center gap-5 p-4 sm:p-5 rounded-2xl text-left transition-all duration-200 active:scale-95 min-h-20 sm:min-h-24 touch-action-none"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            type="button"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <Sprout className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-heading text-base sm:text-lg font-bold text-white">Sono un produttore</div>
              <div className="text-white/60 text-xs mt-0.5">Gestisci la tua azienda e i tuoi prodotti</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors flex-shrink-0" />
          </button>

          {/* Staff Coldiretti */}
          <button
            onClick={handleStaffClick}
            className="group flex items-center gap-5 p-4 sm:p-5 rounded-2xl text-left transition-all duration-200 active:scale-95 min-h-20 sm:min-h-24 touch-action-none"
            style={{ background: 'rgba(245,197,24,0.15)', border: '1.5px solid rgba(245,197,24,0.4)', backdropFilter: 'blur(8px)' }}
            type="button"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,197,24,0.35)' }}>
              <Shield className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: '#f5c518' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-heading text-base sm:text-lg font-bold text-white">Sono dello staff</div>
              <div className="text-white/60 text-xs mt-0.5">Gestisci eventi e comunicazioni Coldiretti</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors flex-shrink-0" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-2 pt-4" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-4 opacity-50">
          <img src="https://media.base44.com/images/public/69cd578540390a850769aa6d/570bdc5f1_cropped-coldiretti-vector-logo.png" alt="Coldiretti" className="h-6 w-auto" />
          <img src="https://media.base44.com/images/public/69cd578540390a850769aa6d/ce1586586_images.jpeg" alt="Campagna Amica" className="h-6 w-auto rounded" />
        </div>
        <p className="text-white/25 text-[10px]">© Coldiretti · Campagna Amica</p>
      </div>

      {/* Modale codice accesso */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-4 sm:px-6">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 max-w-sm w-full sm:max-h-96" style={{ maxHeight: '90vh' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
                {codeType === 'staff' ? 'Accesso Staff' : 'Accesso Produttori'}
              </h2>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-muted-foreground hover:text-foreground transition-colors min-h-10 min-w-10 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Inserisci il codice Coldiretti per continuare</p>
            <Input
              type="text"
              placeholder="Codice di accesso"
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value);
                setCodeError('');
              }}
              onKeyDown={handleKeyDown}
              className="mb-2 text-base"
              autoFocus
              inputMode="text"
            />
            {codeError && <p className="text-sm text-destructive mb-4">{codeError}</p>}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCodeModal(false)}
                className="flex-1 min-h-11"
              >
                Annulla
              </Button>
              <Button
                onClick={handleCodeSubmit}
                className="flex-1 min-h-11"
              >
                Accedi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}