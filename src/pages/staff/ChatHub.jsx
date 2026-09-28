import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyStaffMember } from '@/api/staff';
import BackButton from '@/components/shared/BackButton';
import { MessageCircle, Megaphone, ChevronRight } from 'lucide-react';

export default function ChatHub() {
  const { data: staffProfile } = useQuery({
    queryKey: ['staffProfile-hub'],
    queryFn: getMyStaffMember,
  });
  const isMarketManager = staffProfile?.position === 'market_manager';

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-primary via-primary/95 to-secondary border-b-4 border-secondary px-6 pt-12 pb-8 shadow-lg">
        <BackButton variant="ghost" className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 mb-3" />
        <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-4 py-1.5 mb-3 shadow-md">
          <span className="text-primary font-bold text-xs tracking-widest uppercase">💬 Comunicazioni</span>
        </div>
        <h1 className="font-heading text-3xl font-bold text-white drop-shadow-lg">Chat</h1>
        <p className="text-white/80 text-sm mt-1">Scegli con chi parlare</p>
      </div>

      <div className="px-6 py-6 max-w-2xl mx-auto space-y-3">
        <Link
          to="/staff/chat"
          className="flex items-center gap-4 bg-white rounded-2xl border-2 border-border/50 p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-foreground">Avvia nuova sessione di lavoro</p>
            <p className="text-sm text-muted-foreground mt-0.5">Chat di gruppo con lo staff del tuo mercato</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </Link>

        {isMarketManager && (
          <Link
            to="/staff/rappresentante-chat"
            className="flex items-center gap-4 bg-white rounded-2xl border-2 border-border/50 p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-secondary/20 flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground">Parla con rappresentante produttori</p>
              <p className="text-sm text-muted-foreground mt-0.5">Canale diretto con il rappresentante designato</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </Link>
        )}
      </div>
    </div>
  );
}
