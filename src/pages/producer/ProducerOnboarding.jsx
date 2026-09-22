import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Leaf, ArrowRight, Check, Package, Users, TrendingUp, Zap, X, Loader2 } from 'lucide-react';
import Marchi from '@/components/shared/Marchi';

const STEPS = [
  {
    id: 'welcome',
    title: 'Benvenuto nella rete',
    icon: Leaf,
    description: 'Sei parte di una rete nazionale di fiducia dedita a filiera corta e qualità',
  },
  {
    id: 'what-is',
    title: 'Cosa è Campagna Amica Digital?',
    icon: Users,
    description: 'La rete nazionale dedita ai mercati a km 0',
  },
  {
    id: 'benefits',
    title: 'I tuoi vantaggi',
    icon: TrendingUp,
    description: 'Scopri come crescere con Campagna Amica Digital',
  },
  {
    id: 'ready',
    title: 'Sei pronto?',
    icon: Zap,
    description: 'Inizia subito a gestire i tuoi mercati e prodotti',
  },
];

export default function ProducerOnboarding() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const currentStep = STEPS[step];

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleStart = async () => {
    try {
      setLoading(true);
      // l'onboarding del produttore non richiede piu' un flag sul profilo
      await refreshUser();
      navigate('/produttore');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/produttore');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #004d26 0%, #006633 50%, #00802b 100%)' }}>
      {/* Close button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleSkip}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-100px] right-[-80px] w-80 h-80 rounded-full opacity-5" style={{ background: '#f5c518' }} />
        <div className="absolute bottom-[-60px] left-[-100px] w-72 h-72 rounded-full opacity-5" style={{ background: '#f5c518' }} />

        {/* Logos */}
        <div className="flex items-center justify-center gap-4 mb-8 relative z-10">
          <Marchi altezza={48} fondo="scuro" />
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 relative z-10">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-secondary w-6' : 'bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Card container */}
        <div className="w-full max-w-md">
          <div
            className="rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            {/* Background accent */}
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10" style={{ background: '#f5c518' }} />

            <div className="relative z-10">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-secondary/90 flex items-center justify-center shadow-lg">
                  {React.createElement(currentStep.icon, { className: 'w-8 h-8 text-primary' })}
                </div>
              </div>

              {/* Title */}
              <h2 className="font-heading text-2xl font-bold text-white text-center mb-3">
                {currentStep.title}
              </h2>

              {/* Description + Content */}
              <div className="text-center mb-8">
                {step === 0 && (
                  <div className="space-y-4">
                    <p className="text-white/80 text-sm leading-relaxed">
                      Sei ufficialmente parte della piattaforma Campagna Amica Digital, la rete nazionale dedita ai mercati contadini e alla filiera corta.
                    </p>
                    <div className="bg-white/10 rounded-2xl p-4 border border-white/20">
                      <p className="text-white/90 text-sm font-medium">
                        Qui puoi gestire i tuoi mercati, i tuoi prodotti, e connetterti direttamente con i clienti che credono nei valori della filiera corta.
                      </p>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-4">
                    <p className="text-white/80 text-sm leading-relaxed mb-4">
                      I mercati contadini certificati sono la rete di vendita diretta più estesa in Italia, presente in tutte le regioni.
                    </p>
                    <div className="space-y-3">
                      <div className="bg-white/10 rounded-xl p-3 border border-white/20 text-left">
                        <p className="text-white font-semibold text-sm flex items-center gap-2">
                          <Check className="w-4 h-4 text-secondary flex-shrink-0" />
                          Filiera corta a km 0
                        </p>
                        <p className="text-white/70 text-xs mt-1">Vendi direttamente al consumatore</p>
                      </div>
                      <div className="bg-white/10 rounded-xl p-3 border border-white/20 text-left">
                        <p className="text-white font-semibold text-sm flex items-center gap-2">
                          <Check className="w-4 h-4 text-secondary flex-shrink-0" />
                          Prezzi equi garantiti
                        </p>
                        <p className="text-white/70 text-xs mt-1">Niente intermediari, margini tuoi</p>
                      </div>
                      <div className="bg-white/10 rounded-xl p-3 border border-white/20 text-left">
                        <p className="text-white font-semibold text-sm flex items-center gap-2">
                          <Check className="w-4 h-4 text-secondary flex-shrink-0" />
                          Tanti mercati disponibili
                        </p>
                        <p className="text-white/70 text-xs mt-1">Scegli dove partecipare</p>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <p className="text-white/80 text-sm leading-relaxed mb-4">
                      Con Campagna Amica Digital puoi:
                    </p>
                    <div className="space-y-3">
                      <div className="bg-white/10 rounded-xl p-3 border border-white/20 text-left">
                        <p className="text-white font-semibold text-sm flex items-center gap-2">
                          <Package className="w-4 h-4 text-secondary flex-shrink-0" />
                          Gestire i tuoi prodotti
                        </p>
                        <p className="text-white/70 text-xs mt-1">Aggiungi descrizioni, immagini, prezzi</p>
                      </div>
                      <div className="bg-white/10 rounded-xl p-3 border border-white/20 text-left">
                        <p className="text-white font-semibold text-sm flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-secondary flex-shrink-0" />
                          Tracciare gli ordini
                        </p>
                        <p className="text-white/70 text-xs mt-1">Vedi chi vuole i tuoi prodotti in tempo reale</p>
                      </div>
                      <div className="bg-white/10 rounded-xl p-3 border border-white/20 text-left">
                        <p className="text-white font-semibold text-sm flex items-center gap-2">
                          <Users className="w-4 h-4 text-secondary flex-shrink-0" />
                          Interagire con i clienti
                        </p>
                        <p className="text-white/70 text-xs mt-1">Rispondi a review e comunicazioni</p>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <p className="text-white/80 text-sm leading-relaxed">
                      Sei pronto a iniziare la tua avventura nella rete?
                    </p>
                    <div className="bg-secondary/80 rounded-2xl p-4 border border-secondary">
                      <p className="text-primary font-bold text-sm">
                        Inizia subito a gestire i tuoi mercati, prodotti e clienti.
                      </p>
                    </div>
                    <p className="text-white/70 text-xs">
                      Il nostro team è sempre disponibile per supportarti nei tuoi primi passi.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="px-6 pb-8 space-y-3">
        <div className="flex gap-2">
          {step > 0 && (
            <Button
              onClick={() => setStep(step - 1)}
              variant="outline"
              className="flex-1 bg-white/15 border-white/30 text-white hover:bg-white/25 rounded-xl h-12 font-semibold"
            >
              Indietro
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-xl h-12 font-semibold flex items-center justify-center gap-2"
            >
              Avanti <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleStart}
              disabled={loading}
              className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-xl h-12 font-semibold flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Inizia adesso <ArrowRight className="w-4 h-4" /></>}
            </Button>
          )}
        </div>
        <Button
          onClick={handleSkip}
          variant="ghost"
          className="w-full text-white/70 hover:text-white hover:bg-white/10 rounded-xl h-11 font-medium"
        >
          Salta per ora
        </Button>
      </div>
    </div>
  );
}