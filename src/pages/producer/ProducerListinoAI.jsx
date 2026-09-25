import React, { useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyCompany } from '@/api/companies';
import { useAuth } from '@/lib/AuthContext';
import { useListinoAi } from '@/lib/ListinoAiContext';
import { Button } from '@/components/ui/button';
import { Sparkles, Upload, CheckCircle2, Package, AlertCircle, FileText, Image, Wand2, ArrowRight, Award, Leaf } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

const STEPS = [
  { id: 'upload', label: 'Caricamento file', icon: Upload },
  { id: 'extract', label: 'Estrazione prodotti', icon: Wand2 },
  { id: 'images', label: 'Ricerca immagini', icon: Image },
  { id: 'save', label: 'Salvataggio listino', icon: FileText },
];

export default function ProducerListinoAI() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const inputRef = useRef();
  const { status, activeStep, progress, result, errorMsg, startUpload, reset } = useListinoAi();

  const { data: myCompany } = useQuery({
    queryKey: ['my-company', user?.email],
    queryFn: getMyCompany,
    enabled: !!user?.email,
  });

  const handleFile = async (file) => {
    await startUpload(file, myCompany?.id);
    qc.invalidateQueries(['my-products']);
  };

  if (!myCompany) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <p className="text-muted-foreground mb-4">Completa prima il profilo azienda.</p>
      <Button asChild><Link to="/produttore/azienda">Vai al profilo</Link></Button>
    </div>
  );

  const analyzing = status === 'analyzing';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
       <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-primary/20 px-5 pt-12 pb-5">
         <div className="flex items-start gap-3">
           <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
             <Sparkles className="w-5 h-5 text-primary" />
           </div>
           <div>
             <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-2">
               <Award className="w-3.5 h-3.5 text-primary" />
               <span className="text-primary text-xs font-bold uppercase tracking-widest">Generatore listino</span>
             </div>
             <h1 className="font-heading text-2xl font-bold text-foreground">Listino AI</h1>
             <p className="text-sm text-muted-foreground">Carica il file e l'AI fa il resto</p>
           </div>
         </div>
       </div>

      <div className="px-5 pt-5 pb-24 space-y-5">

        {/* Upload area */}
        {status === 'idle' && (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-4 p-10 rounded-2xl border-2 border-dashed border-primary/30 bg-white hover:border-primary hover:shadow-md transition-all duration-200 group text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground text-base">Trascina o scegli il file</p>
                <p className="text-sm text-muted-foreground mt-1">PDF, immagine, Excel, Word — qualsiasi formato</p>
              </div>
              <div className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                Scegli file
              </div>
            </button>

            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Cosa fa l'AI</p>
              {[
                { icon: '🔍', text: 'Riconosce nome, descrizione e prezzo di ogni prodotto' },
                { icon: '🏷️', text: 'Classifica automaticamente la categoria' },
                { icon: '🖼️', text: 'Estrae o genera immagini per ogni prodotto' },
                { icon: '☁️', text: 'Elabora sul server — puoi uscire dall\'app' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-border/40">
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  <p className="text-sm text-muted-foreground leading-snug">{item.text}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <input ref={inputRef} type="file" className="hidden" accept="*/*"
          onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />

        {/* Analyzing */}
        {analyzing && (
          <div className="bg-white rounded-2xl border border-border/40 shadow-sm overflow-hidden">
            <div className="h-1 bg-primary/20">
              <div
                className="h-1 bg-primary transition-all duration-700 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                </div>
                <div>
                  <p className="font-bold text-foreground">AI al lavoro…</p>
                  <p className="text-xs text-muted-foreground">{progress}% completato</p>
                </div>
              </div>

              <div className="space-y-3">
                {STEPS.map((step, i) => {
                  const done = i < activeStep;
                  const active = i === activeStep;
                  const Icon = step.icon;
                  return (
                    <div key={step.id} className={`flex items-center gap-3 transition-all duration-500 ${active ? 'opacity-100' : done ? 'opacity-60' : 'opacity-25'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-primary text-white' : active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`text-sm font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}{active && <span className="text-primary">…</span>}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl bg-secondary/20 border border-secondary/30 p-4 flex items-start gap-3">
                <span className="text-lg">🌿</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Puoi usare l'app liberamente!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">L'analisi continua in background. Torna qui per il risultato.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Done */}
        {status === 'done' && result && (
          <div className="bg-white rounded-2xl border border-border/40 shadow-sm overflow-hidden">
            <div className="h-1 bg-primary" />
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-lg">Analisi completata!</p>
                  <p className="text-sm text-muted-foreground">{result.count} prodotti aggiunti al listino</p>
                </div>
              </div>
              <Link to="/produttore/prodotti">
                <Button className="w-full rounded-xl gap-2">
                  <Package className="w-4 h-4" /> Vedi i prodotti <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </Link>
              <Button variant="outline" className="w-full rounded-xl" onClick={reset}>
                Carica un altro listino
              </Button>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="bg-white rounded-2xl border border-destructive/20 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <p className="text-sm text-destructive font-medium">{errorMsg || 'Errore durante l\'analisi'}</p>
            </div>
            <Button variant="outline" className="w-full rounded-xl" onClick={reset}>
              Riprova
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}