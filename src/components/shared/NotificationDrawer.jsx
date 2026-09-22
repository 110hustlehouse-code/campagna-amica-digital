import React, { useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bell, Package, ShoppingBag, CheckCheck, X, Leaf } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import Marchi from '@/components/shared/Marchi';

const TYPE_ICON = {
  new_product: Package,
  order_update: ShoppingBag,
  review_reply: Bell,
  generic: Bell,
};

const TYPE_COLOR = {
  new_product: 'text-primary bg-primary/15',
  order_update: 'text-amber-600 bg-amber-100',
  review_reply: 'text-blue-600 bg-blue-100',
  generic: 'text-muted-foreground bg-muted',
};

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) {}
}

function sendBrowserNotification(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') new Notification(title, { body, icon: '/favicon.ico' });
    });
  }
}

function getNotificationUrl(n, isProducer) {
  if (n.type === 'order_update') return isProducer ? '/produttore/ordini' : '/ordini';
  if (n.type === 'new_product' && n.company_id) return `/aziende/${n.company_id}`;
  if (n.type === 'review_reply' && n.company_id) return `/aziende/${n.company_id}`;
  // Event notifications for producers → go to mercati to respond
  if (n.message_id && isProducer) return '/produttore/mercati';
  // Event notifications for clients: if has company_id → go to company, else → mercati
  if (n.message_id && !isProducer) {
    return n.company_id ? `/aziende/${n.company_id}` : '/mercati';
  }
  return null;
}

export default function NotificationDrawer({ open, onClose, notifications = [], onRead, onReadAll, isProducer = false }) {
  const sorted = [...notifications].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const unread = sorted.filter(n => !n.read);
  const prevUnreadCount = useRef(0);
  const navigate = useNavigate();

  useEffect(() => {
    const currentCount = unread.length;
    if (currentCount > prevUnreadCount.current && prevUnreadCount.current !== undefined) {
      const newest = unread[0];
      if (newest) {
        playNotificationSound();
        sendBrowserNotification(newest.title, newest.message || '');
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
    }
    prevUnreadCount.current = currentCount;
  }, [unread.length]);

  useEffect(() => {
    if (open && unread.length > 0) {
      const timer = setTimeout(() => onReadAll(), 1200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full max-w-sm p-0">
        {/* Intestazione istituzionale */}
        <div className="bg-primary px-5 pt-6 pb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-secondary" />
              <span className="text-secondary font-bold text-[9px] tracking-widest uppercase">Campagna Amica Digital</span>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-white font-heading text-xl font-bold flex items-center gap-2">
                <Bell className="w-5 h-5 text-secondary" />
                Notifiche
              </SheetTitle>
              {unread.length > 0 && (
                <p className="text-white/70 text-xs mt-0.5">{unread.length} non {unread.length === 1 ? 'letta' : 'lette'}</p>
              )}
            </div>
            {unread.length > 0 && (
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/20 text-xs gap-1" onClick={onReadAll}>
                <CheckCheck className="w-3.5 h-3.5" /> Tutte lette
              </Button>
            )}
          </div>
        </div>

        {/* Notification list */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Bell className="w-7 h-7 text-primary/30" />
              </div>
              <p className="font-heading text-lg font-bold text-foreground">Nessuna notifica</p>
              <p className="text-sm text-muted-foreground mt-1">
                Aggiungi aziende ai preferiti o effettua ordini per ricevere aggiornamenti.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {sorted.map(n => {
                const Icon = TYPE_ICON[n.type] || Bell;
                const iconColor = TYPE_COLOR[n.type] || TYPE_COLOR.generic;
                const url = getNotificationUrl(n, isProducer);
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-5 py-4 transition-colors ${url ? 'cursor-pointer hover:bg-primary/5' : ''} ${!n.read ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                    onClick={() => {
                      if (!n.read) onRead(n.id);
                      if (url) { onClose(); navigate(url); }
                    }}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: it })}
                      </p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — always visible, not flex-based */}
        <div className="border-t border-border/50 py-4 flex flex-col items-center gap-2 bg-card">
          <div className="flex items-center gap-4">
            <Marchi altezza={32} className="opacity-75" />
          </div>
          <p className="text-[10px] text-muted-foreground">© Campagna Amica Digital · Campo Zero</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}