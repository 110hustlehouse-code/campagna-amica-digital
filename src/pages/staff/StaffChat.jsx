import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { getMyStaffMember } from '@/api/staff';
import { getChatMessages, sendChatMessage, deleteChatMessage } from '@/api/staffChat';
import { subscribeTable } from '@/api/client';
import BackButton from '@/components/shared/BackButton';
import { Button } from '@/components/ui/button';
import { Loader2, Send, MessageCircle, Trash2 } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

function dayLabel(date) {
  if (isToday(date)) return 'Oggi';
  if (isYesterday(date)) return 'Ieri';
  return format(date, 'd MMMM yyyy', { locale: it });
}

export default function StaffChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const { data: staffProfile } = useQuery({
    queryKey: ['staffProfile', user?.email],
    queryFn: getMyStaffMember,
    enabled: !!user?.email,
  });
  const marketId = staffProfile?.market_id || null;
  const myName = staffProfile?.full_name || user?.email || 'Staff';

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['staff-chat', marketId],
    queryFn: () => getChatMessages(marketId),
    enabled: !!marketId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!marketId) return;
    const unsub = subscribeTable('staff_chat_messages', () => {
      qc.invalidateQueries({ queryKey: ['staff-chat', marketId] });
    });
    return () => unsub();
  }, [marketId, qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (message) => sendChatMessage({
      market_id: marketId,
      author_id: user?.id || null,
      author_name: myName,
      message,
    }),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['staff-chat', marketId] });
    },
    onError: (err) => toast({ title: 'Errore', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteChatMessage,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['staff-chat', marketId] }),
  });

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || sendMutation.isPending) return;
    sendMutation.mutate(trimmed);
  };

  // Raggruppa i messaggi per giorno
  const groups = [];
  let lastDay = null;
  messages.forEach(m => {
    const day = dayLabel(new Date(m.created_at));
    if (day !== lastDay) {
      groups.push({ day, items: [] });
      lastDay = day;
    }
    groups[groups.length - 1].items.push(m);
  });

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary/95 to-secondary border-b-4 border-secondary px-6 pt-12 pb-6 shadow-lg flex-shrink-0">
        <div className="flex items-center gap-3">
          <BackButton variant="ghost" className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30" />
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-white" />
            <h1 className="font-heading text-2xl font-bold text-white drop-shadow-lg">Chat Staff</h1>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isLoading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm">Nessun messaggio ancora. Scrivi il primo!</p>
          </div>
        )}
        {groups.map(group => (
          <div key={group.day} className="space-y-2">
            <div className="flex justify-center">
              <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                {group.day}
              </span>
            </div>
            {group.items.map(m => {
              const isMine = m.author_id === user?.id;
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 ${
                    isMine ? 'bg-primary text-white rounded-br-sm' : 'bg-white border border-border rounded-bl-sm'
                  }`}>
                    {!isMine && (
                      <p className="text-[11px] font-bold text-primary mb-0.5">{m.author_name}</p>
                    )}
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isMine ? 'text-white' : 'text-foreground'}`}>
                      {m.message}
                    </p>
                    <div className={`flex items-center gap-2 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className={`text-[10px] ${isMine ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {format(new Date(m.created_at), 'HH:mm')}
                      </span>
                      {isMine && (
                        <button
                          onClick={() => deleteMutation.mutate(m.id)}
                          className="text-white/70 hover:text-white"
                          title="Elimina messaggio"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border bg-white px-4 py-3 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Scrivi un messaggio al team..."
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 max-h-28"
        />
        <Button
          onClick={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
          size="icon"
          className="rounded-xl h-11 w-11 flex-shrink-0"
        >
          {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
