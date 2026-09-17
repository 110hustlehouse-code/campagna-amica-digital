import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Building2, MapPin, ShoppingBag, Sprout, ArrowRight, Leaf, Bell, Award, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ProfileButton from '@/components/home/ProfileButton';
import NewsSection from '@/components/home/NewsSection';

export default function Home() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-featured'],
    queryFn: () => base44.entities.Company.filter({ is_registered: true }, '-created_date', 50),
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['markets-count'],
    queryFn: () => base44.entities.Market.list('-created_date', 50),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['my-notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });

  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user?.email) return;
    const unsub1 = base44.entities.Company.subscribe(() => {
      qc.invalidateQueries({ queryKey: ['companies-featured'] });
    });
    const unsub2 = base44.entities.Market.subscribe(() => {
      qc.invalidateQueries({ queryKey: ['markets-count'] });
    });
    const unsub3 = base44.entities.Notification.subscribe(() => {
      qc.invalidateQueries({ queryKey: ['my-notifications', user?.email] });
    });
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [qc, user?.email]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute top-6 right-6 z-20">
        <ProfileButton />
      </div>

      <div className="relative overflow-hidden min-h-[420px] md:min-h-[620px] flex items-center flex-1">
        <img
          src="https://media.base44.com/images/public/69cd578540390a850769aa6d/70d2750ce_generated_image.png"
          alt="hero"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/20" />

        <div className="relative px-5 md:px-12 py-10 md:py-24 w-full z-10">
          <div className="max-w-2xl">
            <h1 className="font-heading text-4xl md:text-8xl font-bold text-white leading-[1.05] tracking-tight drop-shadow-xl">
              Dal produttore al consumatore
            </h1>

            <p className="text-white/90 text-base md:text-xl mt-5 max-w-lg leading-relaxed font-medium">
              La scelta Coldiretti: Prodotti freschi, genuini e a km 0 direttamente dalle aziende agricole italiane certificate.
            </p>

            <div className="flex gap-3 mt-6">
              <Link to="/mercati">
                <Button size="default" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 font-bold rounded-xl px-5 shadow-xl text-sm">
                  Trova Mercato
                </Button>
              </Link>
              <Link to="/aziende">
                <Button size="default" variant="outline" className="border-white/40 text-white hover:bg-white/15 rounded-xl px-5 text-sm">
                  Aziende
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Aziende di spicco */}
      {companies.length > 0 && (
        <div className="px-6 md:px-12 pt-10 pb-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-secondary fill-secondary" />
                <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground">Aziende di spicco</h2>
              </div>
              <Link to="/aziende" className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline">
                Tutte <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide">
              {companies.slice(0, 8).map(company => (
                <Link key={company.id} to={`/aziende/${company.id}`} className="flex-shrink-0 w-44">
                  <div className="rounded-2xl overflow-hidden border border-border/50 shadow-sm bg-card hover:shadow-md hover:border-primary/30 transition-all h-full">
                    <div className="relative h-28 bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden">
                      {company.cover_image_url ? (
                        <img src={company.cover_image_url} alt={company.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Leaf className="w-8 h-8 text-primary/20" />
                        </div>
                      )}
                      {company.logo_url && (
                        <div className="absolute bottom-2 left-2 w-9 h-9 rounded-xl border-2 border-white shadow bg-white overflow-hidden flex-shrink-0">
                          <img src={company.logo_url} alt="logo" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-semibold text-sm text-foreground leading-tight line-clamp-1">{company.name}</p>
                      {company.city && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />{company.city}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        <Award className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="text-[10px] text-primary font-semibold uppercase tracking-wide">Certificata</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="px-6 md:px-12 py-10 flex-1">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-5">
            Scopri Coldiretti
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/aziende" className="group block">
            <Card className="border border-border/40 hover:border-primary/30 hover:shadow-lg transition-all h-full">
              <CardContent className="p-5 flex flex-col h-full min-h-[130px]">
                <Building2 className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-heading font-bold text-foreground text-sm">Aziende</h3>
                <p className="text-xs text-muted-foreground mt-1 flex-1">Scopri le aziende agricole</p>
                <ArrowRight className="w-3.5 h-3.5 text-primary mt-2" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/mercati" className="group block">
            <Card className="border border-border/40 hover:border-primary/30 hover:shadow-lg transition-all h-full">
              <CardContent className="p-5 flex flex-col h-full min-h-[130px]">
                <MapPin className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-heading font-bold text-foreground text-sm">Mercati</h3>
                <p className="text-xs text-muted-foreground mt-1 flex-1">Il mercato piu vicino</p>
                <ArrowRight className="w-3.5 h-3.5 text-primary mt-2" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/ordini" className="group block">
            <Card className="border border-border/40 hover:border-primary/30 hover:shadow-lg transition-all h-full">
              <CardContent className="p-5 flex flex-col h-full min-h-[130px]">
                <ShoppingBag className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-heading font-bold text-foreground text-sm">Ordini</h3>
                <p className="text-xs text-muted-foreground mt-1 flex-1">Gestisci i tuoi ordini</p>
                <ArrowRight className="w-3.5 h-3.5 text-primary mt-2" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/stagionalita" className="group block">
            <Card className="border border-border/40 hover:border-primary/30 hover:shadow-lg transition-all h-full">
              <CardContent className="p-5 flex flex-col h-full min-h-[130px]">
                <Sprout className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-heading font-bold text-foreground text-sm">Stagionalita</h3>
                <p className="text-xs text-muted-foreground mt-1 flex-1">Cosa e di stagione ora</p>
                <ArrowRight className="w-3.5 h-3.5 text-primary mt-2" />
              </CardContent>
            </Card>
          </Link>
          </div>
        </div>
      </div>

      <NewsSection />
    </div>
  );
}