import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Check, X, MessageCircle, Users } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function StaffMessageDetails({ message, open, onOpenChange }) {
  const [feedbackInput, setFeedbackInput] = useState('');
  const qc = useQueryClient();

  const { data: reads = [] } = useQuery({
    queryKey: ['message-reads', message?.id],
    queryFn: () => base44.entities.StaffMessageRead.filter({ message_id: message?.id }),
    enabled: !!message?.id,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-registered'],
    queryFn: () => base44.entities.Company.filter({ is_registered: true }),
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (feedback) => {
      const user = await base44.auth.me();
      const userCompany = companies.find(c => c.created_by === user.email);
      
      const existingRead = reads.find(r => r.producer_email === user.email && r.message_id === message.id);
      
      if (existingRead) {
        return base44.entities.StaffMessageRead.update(existingRead.id, {
          feedback: feedback,
          read_at: new Date().toISOString(),
        });
      } else {
        return base44.entities.StaffMessageRead.create({
          message_id: message.id,
          producer_email: user.email,
          company_id: userCompany?.id,
          read_at: new Date().toISOString(),
          feedback: feedback,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries(['message-reads']);
      setFeedbackInput('');
    },
  });

  const readCount = reads.length;
  const producerCount = companies.length;
  const readPercentage = producerCount > 0 ? Math.round((readCount / producerCount) * 100) : 0;

  const readByProducers = reads.map(r => {
    const company = companies.find(c => c.id === r.company_id);
    return { ...r, companyName: company?.name };
  });

  if (!message) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{message.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Riepilogo letture */}
          <div className="bg-primary/10 rounded-xl border border-primary/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Conferme di lettura
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {readCount} / {producerCount}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">{readPercentage}%</p>
                <p className="text-xs text-muted-foreground">lettori</p>
              </div>
            </div>
            <div className="mt-3 w-full bg-primary/20 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${readPercentage}%` }}
              />
            </div>
          </div>

          {/* Lista dettagliata delle letture */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              Lettori ({readCount})
            </h3>
            {readByProducers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nessuna conferma di lettura ancora</p>
            ) : (
              <div className="space-y-2">
                {readByProducers.map(read => (
                  <div key={read.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">{read.companyName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(read.read_at), 'PPP HH:mm', { locale: it })}
                        </p>
                        {read.feedback && (
                          <p className="text-xs text-foreground/70 mt-2 italic">"{read.feedback}"</p>
                        )}
                      </div>
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Non lettori */}
          {readCount < producerCount && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <X className="w-4 h-4 text-amber-600" />
                In sospeso ({producerCount - readCount})
              </h3>
              <div className="space-y-2">
                {companies
                  .filter(company => !reads.some(r => r.company_id === company.id))
                  .map(company => (
                    <div key={company.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="font-semibold text-sm text-foreground">{company.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">In attesa di lettura</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}