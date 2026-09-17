import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReviewModal({ open, onClose, company }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const queryClient = useQueryClient();

  const submitReview = useMutation({
    mutationFn: async () => {
      await base44.entities.Review.create({
        company_id: company.id,
        rating,
        message: text,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', company.id] });
      setRating(0);
      setText('');
      toast.success('Recensione inviata all\'azienda');
      onClose();
    },
  });

  const handleSubmit = async () => {
    if (rating === 0 || !text.trim()) return;
    submitReview.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">Lascia una recensione</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Cosa ne pensi di {company?.name}?</p>

          <div>
            <label className="text-sm font-semibold block mb-2">Voto</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${star <= rating ? 'fill-secondary text-secondary' : 'text-muted-foreground'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold block mb-2">Descrivi la tua esperienza</label>
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Condividi il tuo parere..."
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Annulla</Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || !text.trim() || submitReview.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {submitReview.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Star className="w-4 h-4 mr-1" />}
              Invia recensione
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}