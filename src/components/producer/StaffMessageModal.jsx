import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markMessageRead } from '@/api/staff';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Check, AlertCircle, Zap, Calendar, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const TYPE_ICONS = {
  closure: AlertCircle,
  special_opening: Zap,
  event: Calendar,
};

const TYPE_COLORS = {
  closure: 'text-red-600',
  special_opening: 'text-green-600',
  event: 'text-blue-600',
};

export default function StaffMessageModal({ message, open, onOpenChange, companyId }) {
  const [feedback, setFeedback] = useState('');
  const [hasRead, setHasRead] = useState(false);
  const qc = useQueryClient();

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      return markMessageRead(message.id, companyId ?? null, feedback || undefined);
    },
    onSuccess: () => {
      qc.invalidateQueries(['message-reads']);
      setHasRead(true);
      setTimeout(() => {
        onOpenChange(false);
        setFeedback('');
        setHasRead(false);
      }, 1500);
    },
  });

  if (!message) return null;

  const Icon = TYPE_ICONS[message.type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {Icon && <Icon className={`w-6 h-6 ${TYPE_COLORS[message.type]}`} />}
            <DialogTitle className="font-heading text-lg">{message.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {message.description && (
            <p className="text-sm text-foreground/80">{message.description}</p>
          )}

          <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Luogo</p>
              <p className="text-foreground">{message.location}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Data</p>
              <p className="text-foreground">
                {format(new Date(message.event_date), 'EEEE d MMMM yyyy', { locale: it })}
              </p>
            </div>
            {message.time_start && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">Orario</p>
                <p className="text-foreground">
                  {message.time_start}
                  {message.time_end && ` - ${message.time_end}`}
                </p>
              </div>
            )}
            {message.is_mandatory && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-xs text-amber-700 font-semibold bg-amber-50 rounded px-2 py-1 inline-block">
                  ⚠️ Comunicazione obbligatoria
                </p>
              </div>
            )}
          </div>

          {message.details && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700 font-semibold mb-1">Dettagli aggiuntivi</p>
              <p className="text-sm text-blue-900">{message.details}</p>
            </div>
          )}

          {/* Allegati */}
          {message.attachments?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2 uppercase">Allegati</h4>
              <div className="space-y-2">
                {message.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    download={att.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors group"
                  >
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-blue-900 font-medium truncate">{att.name}</span>
                    <Download className="w-4 h-4 text-blue-600 flex-shrink-0 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Section */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 block">
              Feedback (facoltativo)
            </label>
            <Textarea
              placeholder="Condividi il tuo feedback..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="h-20 resize-none text-sm"
              disabled={hasRead}
            />
          </div>

          {hasRead && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700 font-semibold">Lettura confermata</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={markAsReadMutation.isPending}
          >
            Chiudi
          </Button>
          {!hasRead && (
            <Button
              onClick={() => markAsReadMutation.mutate()}
              disabled={markAsReadMutation.isPending}
              className="gap-2"
            >
              {markAsReadMutation.isPending ? (
                <>Invio...</>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Conferma lettura
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}