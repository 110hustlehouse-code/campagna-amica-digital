import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReviews } from '@/api/reviews';
import { invokeFunction } from '@/api/functions';
import { Star, MessageSquare, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

export default function ReviewsList({ companyId }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['company-reviews', companyId],
    queryFn: () => getReviews(companyId),
    enabled: !!companyId,
  });

  const handleReply = async () => {
    if (!replyText.trim()) {
      toast({ title: 'Scrivi una risposta', variant: 'destructive' });
      return;
    }

    setSendingReply(true);
    try {
      await invokeFunction('replyToReview', {
        review_id: replyingTo,
        reply_text: replyText.trim()
      });
      toast({ title: 'Risposta inviata con notifica!' });
      setReplyingTo(null);
      setReplyText('');
      qc.invalidateQueries({ queryKey: ['company-reviews', companyId] });
    } catch (error) {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    } finally {
      setSendingReply(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">Nessuna recensione ancora</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map(review => (
        <div key={review.id} className="bg-white rounded-xl border border-primary/20 p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-secondary text-secondary' : 'text-muted-foreground'}`}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {new Date(review.created_date).toLocaleDateString('it-IT')}
              </span>
            </div>
          </div>

          {review.message && (
            <p className="text-sm text-foreground">{review.message}</p>
          )}

          {review.reply ? (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-primary mb-1">La tua risposta</p>
              <p className="text-sm text-foreground">{review.reply}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(review.reply_date).toLocaleDateString('it-IT')}
              </p>
            </div>
          ) : (
            <>
              {replyingTo === review.id ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Scrivi la tua risposta..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="resize-none h-20"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText('');
                      }}
                      disabled={sendingReply}
                    >
                      Annulla
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleReply}
                      disabled={sendingReply}
                      className="gap-1"
                    >
                      {sendingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      Invia risposta
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setReplyingTo(review.id)}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  Rispondi
                </button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}