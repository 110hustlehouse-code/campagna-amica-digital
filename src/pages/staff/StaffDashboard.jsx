// v8
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { subscribeTable } from '@/api/client';
import { getMyProfile } from '@/api/auth';
import { getMyStaffMember } from '@/api/staff';
import { getNeedsByMarket } from '@/api/needs';
import { getRentalsByMarket } from '@/api/rentals';
import { getCompaniesByMarket } from '@/api/companies';
import { getMyNotifications, segnaLetta } from '@/api/notifications';
import { getSegnalazioniStagionaliMercato, risolviSegnalazioneStagionale } from '@/api/segnalazioniStagionali';
import { format, startOfToday } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertCircle, TrendingUp, Clock, CalendarPlus, ChevronDown, Users, CalendarOff, Leaf, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import NeedsSection from '@/components/staff/NeedsSection';
import RentalsSection from '@/components/staff/RentalsSection';
import EventsSection from '@/components/staff/EventsSection';
import RsvpSection from '@/components/staff/RsvpSection.jsx';

const MESI_NOMI = ['', 'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];


function AbsenceButton({ needs }) {
  const absences = (needs || []).filter(n => n.title?.includes('Assenza segnalata') && n.status === 'open');
  return (
    <Link to="/staff/assenze" className="relative flex-shrink-0">
      <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors">
        <CalendarOff className="w-5 h-5 text-white" />
      </div>
      {absences.length > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-white text-white text-[9px] font-bold flex items-center justify-center">
          {absences.length}
        </span>
      )}
    </Link>
  );
}


const INITIAL_NEEDS_SHOW = 3;

export default function StaffDashboard() {
  const today = startOfToday();
  const qc = useQueryClient();
  const [openSections, setOpenSections] = useState({ seasonal: true, needs: true, rentals: false, events: false, rsvp: false });
  const [showAllNeeds, setShowAllNeeds] = useState(false);

  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // 1. Carica l'utente corrente
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: getMyProfile,
  });

  // 2. Carica il profilo staff per ottenere il market_id
  const { data: staffProfile } = useQuery({
    queryKey: ['staffProfile', me?.email],
    queryFn: getMyStaffMember,
    enabled: !!me?.email,
  });

  const staffMarketId = staffProfile?.market_id || null;
  const staffReady = !!staffMarketId;

  // 3. Real-time subscriptions (solo quando il marketId è noto)
  useEffect(() => {
    if (!staffReady) return;
    const u1 = subscribeTable('producer_needs', () => {
      qc.invalidateQueries({ queryKey: ['dash-needs', staffMarketId] });
    }, { filtro: `market_id=eq.${staffMarketId}` });
    const u2 = subscribeTable('stall_rentals', () => {
      qc.invalidateQueries({ queryKey: ['dash-rentals', staffMarketId] });
    }, { filtro: `market_id=eq.${staffMarketId}` });
    const u3 = subscribeTable('companies', () => {
      qc.invalidateQueries({ queryKey: ['dash-companies', staffMarketId] });
    });
    const u4 = subscribeTable('staff_messages', () => {
      qc.invalidateQueries({ queryKey: ['dash-events', staffMarketId] });
    }, { filtro: `market_id=eq.${staffMarketId}` });
    return () => { u1(); u2(); u3(); u4(); };
  }, [staffReady, staffMarketId, qc]);

  // Segnalazioni prodotti fuori stagione rilevate su DDT emesso, per questo mercato
  const { data: seasonalAlerts = [] } = useQuery({
    queryKey: ['seasonal-alerts', staffMarketId],
    queryFn: () => getSegnalazioniStagionaliMercato(staffMarketId),
    enabled: staffReady,
  });

  const markAlertRead = async (id) => {
    await risolviSegnalazioneStagionale(id);
    qc.invalidateQueries({ queryKey: ['seasonal-alerts', staffMarketId] });
  };

  // 4. Bisogni filtrati per mercato (tutti gli stati per la dashboard)
  const { data: needs = [] } = useQuery({
    queryKey: ['dash-needs', staffMarketId],
    queryFn: () => getNeedsByMarket(staffMarketId),
    enabled: staffReady,
    refetchInterval: 5000, // poll: il realtime da solo non è affidabile ovunque
  });

  // 5. Affitti del mercato (tutti gli stati)
  const { data: rentals = [] } = useQuery({
    queryKey: ['dash-rentals', staffMarketId],
    queryFn: () => getRentalsByMarket(staffMarketId),
    enabled: staffReady,
  });

  // 6. Aziende del mercato dello staff
  const { data: companies = [] } = useQuery({
    queryKey: ['dash-companies', staffMarketId],
    queryFn: async () => {
      const aziende = await getCompaniesByMarket(staffMarketId);
      return aziende.filter(c => c.is_registered);
    },
    enabled: staffReady,
  });

  // Metriche calcolate
  const openNeeds = useMemo(() => {
    return [...needs].filter(n => n.status === 'open').sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
    });
  }, [needs]);

  const urgentNeeds = useMemo(() => needs.filter(n => n.priority === 'high' && n.status === 'open'), [needs]);

  const upcomingRentals = useMemo(() => {
    const now = new Date();
    return rentals
      .filter(r => {
        if (!r.rental_end_date) return false;
        const days = Math.floor((new Date(r.rental_end_date) - now) / 86400000);
        return days >= 0 && days <= 30;
      })
      .sort((a, b) => new Date(a.rental_end_date) - new Date(b.rental_end_date));
  }, [rentals]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-primary/95 to-secondary border-b-4 border-secondary px-6 pt-12 pb-8 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-secondary rounded-full px-4 py-1.5 mb-3 shadow-md">
              <span className="text-primary font-bold text-xs tracking-widest uppercase">📊 Dashboard Operativo</span>
            </div>
            <h1 className="font-heading text-4xl font-bold text-white drop-shadow-lg">Mercati</h1>
            <p className="text-white/90 text-sm mt-2 font-medium">{format(today, 'EEEE, d MMMM yyyy', { locale: it })}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/staff/segnalazioni-ddt" className="flex-shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-colors">
                <FileWarning className="w-5 h-5 text-white" />
              </div>
            </Link>
            <AbsenceButton needs={needs} />
          </div>
        </div>
      </div>

      <div className="px-6 py-8 space-y-8">

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Bisogni aperti */}
          <div className="flex flex-col items-center justify-center bg-white rounded-2xl border border-red-100 py-5 px-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-500 leading-none">{openNeeds.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1 text-center leading-tight">Bisogni<br/>aperti</p>
          </div>

          {/* Affitti con scadenza */}
          <div className="flex flex-col items-center justify-center bg-white rounded-2xl border border-amber-100 py-5 px-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-2">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-600 leading-none">{upcomingRentals.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1 text-center leading-tight">Affitti in<br/>scadenza</p>
          </div>

          {/* Aziende attive */}
          <div className="flex flex-col items-center justify-center bg-white rounded-2xl border border-primary/10 py-5 px-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center mb-2">
              <TrendingUp className="w-5 h-5 text-primary/60" />
            </div>
            <p className="text-2xl font-bold text-primary leading-none">{companies.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1 text-center leading-tight">Aziende<br/>attive</p>
          </div>
        </div>

        {/* Prodotti Fuori Stagione */}
        {seasonalAlerts.length > 0 && (() => {
          // Raggruppa per company_id
          const byCompany = seasonalAlerts.reduce((acc, alert) => {
            const key = alert.company_id || 'unknown';
            if (!acc[key]) acc[key] = [];
            acc[key].push(alert);
            return acc;
          }, {});
          return (
            <div className="rounded-2xl border border-orange-200 bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection('seasonal')}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-orange-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-orange-500" />
                  <span className="font-heading text-lg font-bold text-foreground">Prodotti Fuori Stagione</span>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold">
                    {seasonalAlerts.length}
                  </span>
                </div>
                <ChevronDown className={cn('w-5 h-5 text-muted-foreground transition-transform', openSections.seasonal && 'rotate-180')} />
              </button>
              {openSections.seasonal && (
                <div className="px-5 pb-5 space-y-4">
                  {Object.entries(byCompany).map(([companyId, alerts]) => {
                    const company = companies.find(c => c.id === companyId);
                    const companyName = company?.name || 'Azienda sconosciuta';
                    return (
                      <div key={companyId}>
                        <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-2">{companyName}</p>
                        <div className="space-y-2">
                          {alerts.map(alert => (
                            <div key={alert.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-orange-800 leading-tight">{alert.product_name}</p>
                                <p className="text-xs text-orange-700 mt-1 leading-relaxed">
                                  "{alert.seasonal_match}" fuori stagione — stagione: {(alert.season_months || []).map(m => MESI_NOMI[m]).join(', ')}
                                </p>
                              </div>
                              <button
                                onClick={() => markAlertRead(alert.id)}
                                className="flex-shrink-0 text-[11px] text-orange-500 hover:text-orange-700 font-medium underline whitespace-nowrap"
                              >
                                Segna letta
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Bisogni Mercati */}
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => toggleSection('needs')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="font-heading text-lg font-bold text-foreground">Bisogni Mercati</span>
              {openNeeds.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {openNeeds.length}
                </span>
              )}
            </div>
            <ChevronDown className={cn('w-5 h-5 text-muted-foreground transition-transform', openSections.needs && 'rotate-180')} />
          </button>
          {openSections.needs && (
            <div className="px-5 pb-5">
              <NeedsSection
                needs={showAllNeeds ? openNeeds : openNeeds.slice(0, INITIAL_NEEDS_SHOW)}
                companies={companies}
              />
              {openNeeds.length > INITIAL_NEEDS_SHOW && (
                <button
                  onClick={() => setShowAllNeeds(!showAllNeeds)}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                >
                  <ChevronDown className={cn('w-4 h-4 transition-transform', showAllNeeds && 'rotate-180')} />
                  {showAllNeeds ? 'Mostra meno' : `Mostra altri ${openNeeds.length - INITIAL_NEEDS_SHOW} bisogni`}
                </button>
              )}
              {openNeeds.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">Nessun bisogno aperto</p>
              )}
              <Link
                to="/staff/bisogni"
                className="mt-3 flex items-center justify-center gap-1.5 text-xs text-primary font-medium hover:underline"
              >
                Vedi tutti i bisogni →
              </Link>
            </div>
          )}
        </div>

        {/* Scadenze Affitti */}
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => toggleSection('rentals')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span className="font-heading text-lg font-bold text-foreground">Scadenze Affitti</span>
              {upcomingRentals.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] font-bold">
                  {upcomingRentals.length}
                </span>
              )}
            </div>
            <ChevronDown className={cn('w-5 h-5 text-muted-foreground transition-transform', openSections.rentals && 'rotate-180')} />
          </button>
          {openSections.rentals && (
            <div className="px-5 pb-5">
              <RentalsSection rentals={upcomingRentals} companies={companies} />
              {upcomingRentals.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">Nessuna scadenza imminente (entro 30 giorni)</p>
              )}
              <Link
                to="/staff/affitti"
                className="mt-3 flex items-center justify-center gap-1.5 text-xs text-primary font-medium hover:underline"
              >
                Gestisci tutti gli affitti →
              </Link>
            </div>
          )}
        </div>

        {/* Eventi Programmati */}
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => toggleSection('events')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CalendarPlus className="w-5 h-5 text-primary" />
              <span className="font-heading text-lg font-bold text-foreground">Eventi Programmati</span>
            </div>
            <ChevronDown className={cn('w-5 h-5 text-muted-foreground transition-transform', openSections.events && 'rotate-180')} />
          </button>
          {openSections.events && (
            <div className="px-5 pb-5">
              <EventsSection marketId={staffMarketId} />
              <Link
                to="/staff/crea-evento"
                className="mt-3 flex items-center justify-center gap-1.5 text-xs text-primary font-medium hover:underline"
              >
                + Crea nuovo evento
              </Link>
            </div>
          )}
        </div>

        {/* Adesioni & Rifiuti Eventi Facoltativi */}
        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => toggleSection('rsvp')}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span className="font-heading text-lg font-bold text-foreground">Adesioni Produttori</span>
            </div>
            <ChevronDown className={cn('w-5 h-5 text-muted-foreground transition-transform', openSections.rsvp && 'rotate-180')} />
          </button>
          {openSections.rsvp && (
            <div className="px-5 pb-5">
              <RsvpSection marketId={staffMarketId} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}