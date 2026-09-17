import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createNeed } from '@/api/needs';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, LogIn, LogOut, Send, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const QUICK_REQUESTS = [
  { id: 'cleaning', label: '🧹 Serve pulizia', category: 'maintenance' },
  { id: 'bags', label: '🛍️ Mancano buste', category: 'bags' },
  { id: 'materials', label: '📦 Servono materiali', category: 'materials' },
  { id: 'urgent', label: '⚠️ Problema urgente', category: 'urgent' },
  { id: 'other', label: '💬 Altro', category: 'other' },
];

export default function ProducerSessionPanel({ myCompany, marketId }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [sessionActive, setSessionActive] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [bagSize, setBagSize] = useState('');

  const createNeedMutation = useMutation({
    mutationFn: async (needData) => {
      return createNeed(needData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companyNeeds'] });
      toast({ title: 'Bisogno segnalato', description: 'Lo staff è stato notificato' });
      setShowDialog(false);
      setSelectedRequest(null);
      setCustomMessage('');
    },
    onError: (err) => {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
    },
  });

  const handleQuickRequest = (request) => {
    if (request.id === 'other' || request.id === 'bags') {
      setSelectedRequest(request);
      setBagSize('');
      setShowDialog(true);
    } else {
      createNeedMutation.mutate({
        company_id: myCompany.id,
        market_id: marketId,
        category: request.category,
        title: request.label,
        description: `Richiesta rapida dalla sessione di ${myCompany.name}`,
        priority: request.category === 'urgent' ? 'high' : 'medium',
        status: 'open',
      });
    }
  };

  const handleSubmitDialog = () => {
    if (selectedRequest?.id === 'bags') {
      if (!bagSize) {
        toast({ title: 'Seleziona la dimensione', variant: 'destructive' });
        return;
      }
      createNeedMutation.mutate({
        company_id: myCompany.id,
        market_id: marketId,
        category: 'bags',
        title: `🛍️ Mancano buste`,
        description: `Richiesta rapida dalla sessione di ${myCompany.name}`,
        size: bagSize,
        priority: 'medium',
        status: 'open',
      });
    } else {
      if (!customMessage.trim()) {
        toast({ title: 'Messaggio vuoto', variant: 'destructive' });
        return;
      }
      createNeedMutation.mutate({
        company_id: myCompany.id,
        market_id: marketId,
        category: selectedRequest.category,
        title: `Messaggio da ${myCompany.name}`,
        description: customMessage,
        priority: 'medium',
        status: 'open',
      });
    }
  };

  if (!sessionActive) {
    return (
      <Button
        onClick={() => setSessionActive(true)}
        className="w-full rounded-xl gap-2 h-11 bg-primary hover:bg-primary/90 text-base font-semibold"
      >
        <LogIn className="w-5 h-5" />
        Apri Sessione Comunicazione
      </Button>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-2xl p-6 space-y-4">
      {/* Header sessione attiva */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <div>
            <p className="font-bold text-foreground text-sm">Sessione Attiva</p>
            <p className="text-xs text-muted-foreground">Comunica con lo staff in tempo reale</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSessionActive(false)}
          className="text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>

      {/* Richieste rapide */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Cosa serve?</p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_REQUESTS.map(request => (
            <Button
              key={request.id}
              variant="outline"
              onClick={() => handleQuickRequest(request)}
              disabled={createNeedMutation.isPending}
              className="h-12 rounded-lg border-primary/20 hover:bg-primary/10 hover:border-primary/40 text-sm font-medium whitespace-normal"
            >
              {createNeedMutation.isPending && request.id === selectedRequest?.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                request.label
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Dialog per messaggio personalizzato */}
      {showDialog && (
        <Dialog open onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md mx-4 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Scrivi un messaggio
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {selectedRequest?.id === 'bags' ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Seleziona la dimensione delle buste mancanti:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['piccole', 'medie', 'grandi'].map(size => (
                      <button
                        key={size}
                        onClick={() => setBagSize(size)}
                        className={`py-3 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                          bagSize === size
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-white text-foreground hover:border-primary/40'
                        }`}
                      >
                        {size === 'piccole' ? '🛍️ S' : size === 'medie' ? '🛍️ M' : '🛍️ L'}
                        <p className="text-xs mt-1 font-normal capitalize">{size}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <Textarea
                  placeholder="Descrivi il problema o la richiesta..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="min-h-24 rounded-lg"
                />
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  className="flex-1"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleSubmitDialog}
                  disabled={createNeedMutation.isPending || (selectedRequest?.id === 'bags' ? !bagSize : !customMessage.trim())}
                  className="flex-1 gap-2"
                >
                  {createNeedMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Invia
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Info sessione */}
      <div className="bg-white/60 rounded-lg p-3 text-xs text-muted-foreground border border-primary/10">
        <p>Le tue richieste verranno comunicate direttamente allo staff nel pannello bisogni.</p>
      </div>
    </div>
  );
}