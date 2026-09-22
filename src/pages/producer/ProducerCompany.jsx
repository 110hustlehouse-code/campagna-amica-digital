import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/client';
import { getMyCompany, createCompany, updateCompany, sincronizzaMercati } from '@/api/companies';
import { getMarkets } from '@/api/markets';
import { uploadFile } from '@/api/storage';
import { invokeLLM } from '@/api/ai';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2, Save, Upload, Camera, MapPin, Phone, Globe, Mail, Award, Leaf, LogOut, Sparkles, Search, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';

const CATEGORIES = [
  { value: 'ortofrutticola', label: '🥦 Ortofrutticola' },
  { value: 'lattiero_casearia', label: '🧀 Lattiero-Casearia' },
  { value: 'vinicola', label: '🍷 Vinicola' },
  { value: 'olearia', label: '🫒 Olearia' },
  { value: 'cerealicola', label: '🌾 Cerealicola' },
  { value: 'zootecnica', label: '🐄 Zootecnica' },
  { value: 'apicoltura', label: '🍯 Apicoltura' },
  { value: 'altro', label: '🌿 Altro' },
];

export default function ProducerCompany() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [improvingDescription, setImprovingDescription] = useState(false);
  const [marketSearchQuery, setMarketSearchQuery] = useState('');

  const { data: myCompany, isLoading } = useQuery({
    queryKey: ['my-company', user?.email],
    queryFn: getMyCompany,
    enabled: !!user?.email,
    select: d => d[0],
  });

  const { data: markets = [] } = useQuery({
    queryKey: ['all-markets'],
    queryFn: getMarkets,
  });

  useEffect(() => {
    if (myCompany) {
      setForm({ ...myCompany });
      setIsEditing(true);
      setShowSaveButton(false);
    } else if (myCompany === undefined && !isLoading) {
      setForm({ name: '', description: '', category: 'altro', region: '', city: '', phone: '', email: '', website: '', market_ids: [], market_schedules: [] });
      setIsEditing(true);
      setShowSaveButton(true);
    }
  }, [myCompany, isLoading]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // 1. Salva l'azienda
      let companyId = myCompany?.id;
      if (companyId) {
        await updateCompany(companyId, { ...data, is_registered: true });
      } else {
        const created = await createCompany({ ...data, is_registered: true });
        companyId = created?.id;
      }

      // 2. Mercati in cui l'azienda e' presente.
      // Una sola chiamata: la funzione del database verifica i permessi
      // e tiene allineate le due tabelle.
      await sincronizzaMercati(companyId, data.market_ids || []);
    },
    onSuccess: () => {
      qc.invalidateQueries(['my-company']);
      qc.invalidateQueries(['all-markets']);
      toast({ title: 'Azienda salvata!' });
      setIsEditing(false);
      setShowSaveButton(false);
    },
  });

  const handleUpload = async (file, field) => {
    if (field === 'logo_url') setUploadingLogo(true); else setUploadingCover(true);
    const { file_url } = await uploadFile(file, 'aziende');
    // Aggiorna stato locale
    setForm(f => ({ ...f, [field]: file_url }));
    // Salva immediatamente nel DB se l'azienda esiste già
    if (myCompany?.id) {
      await updateCompany(myCompany.id, { [field]: file_url });
      qc.invalidateQueries(['my-company']);
      qc.invalidateQueries(['companies']);
      qc.invalidateQueries(['company', myCompany.id]);
      toast({ title: field === 'logo_url' ? 'Logo aggiornato!' : 'Copertina aggiornata!' });
    } else {
      // Se l'azienda non è ancora creata, mostra il pulsante salva
      setShowSaveButton(true);
    }
    if (field === 'logo_url') setUploadingLogo(false); else setUploadingCover(false);
  };

  const improveDescription = async () => {
    if (!form.description) return;
    setImprovingDescription(true);
    const res = await invokeLLM({
      prompt: `Sei un copywriter specializzato in aziende agricole italiane. Migliora questa descrizione per renderla più professionale, accattivante e persuasiva. 

  Descrizione originale: "${form.description}"

  Linee guida:
  - Rendi il testo più vibrante e professionale
  - Evidenzia qualità, sostenibilità e tradizione
  - Aggiungi elementi che catturino l'attenzione degli acquiratori
  - Mantieni un tono caldo e autentico
  - Lunghezza: massimo 200 caratteri

  Rispondi SOLO con la descrizione migliorata, senza altre parole o spiegazioni.`
    });
    setForm(f => ({ ...f, description: res.data }));
    setShowSaveButton(true);
    setImprovingDescription(false);
    toast({ title: '✨ Descrizione migliorata!' });
  };

  if (isLoading || !form) return (
    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Cover */}
      <div className="relative h-44 overflow-hidden">
        {form.cover_image_url ? (
          <img src={form.cover_image_url} alt="copertina" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-secondary/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        <label className="absolute top-4 right-4 flex items-center gap-1.5 cursor-pointer bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-colors px-3 py-1.5 rounded-xl text-white text-xs font-medium">
          {uploadingCover ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          Copertina
          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleUpload(e.target.files[0], 'cover_image_url')} />
        </label>
      </div>

      {/* Logo + nome */}
      <div className="px-5 -mt-8 mb-6">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl border-4 border-primary/30 shadow-lg overflow-hidden bg-white flex items-center justify-center">
              {form.logo_url
                ? <img src={form.logo_url} alt="logo" className="w-full h-full object-cover" />
                : <Building2 className="w-7 h-7 text-muted-foreground" />
              }
            </div>
            <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center cursor-pointer shadow">
              {uploadingLogo ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <Camera className="w-3 h-3 text-white" />}
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleUpload(e.target.files[0], 'logo_url')} />
            </label>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-2">
              <Award className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary text-[9px] font-bold uppercase tracking-wider">Profilo azienda</span>
            </div>
            <p className="font-heading text-lg font-bold text-foreground">{form.name || 'La mia azienda'}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Leaf className="w-3 h-3 text-primary" />
              {form.city || 'Profilo azienda'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-24 space-y-4">

        {/* Info azienda */}
        <div className="bg-white rounded-2xl border-2 border-primary/20 shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-secondary" />
          <div className="px-4 py-3 border-b border-border/20">
            <p className="font-semibold text-sm text-foreground">Informazioni azienda</p>
          </div>
          <div className="p-4 space-y-3">
            <Input placeholder="Ragione sociale / Nome *" value={form.name || ''} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setShowSaveButton(true); }} className="font-medium" disabled={!isEditing} />
            <div className="relative">
              <Textarea placeholder="Descrizione dell'azienda" value={form.description || ''} onChange={e => { setForm(f => ({ ...f, description: e.target.value })); setShowSaveButton(true); }} className="resize-none min-h-[100px] pr-12" disabled={!isEditing} />
              {isEditing && form.description && (
                <button
                  onClick={improveDescription}
                  disabled={improvingDescription}
                  className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {improvingDescription ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Migliora con IA
                </button>
              )}
            </div>
            <Select value={form.category || 'altro'} onValueChange={v => { setForm(f => ({ ...f, category: v })); setShowSaveButton(true); }} disabled={!isEditing}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* Sede */}
        <div className="bg-white rounded-2xl border-2 border-primary/20 shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-secondary" />
          <div className="px-4 py-3 border-b border-border/20">
            <p className="font-semibold text-sm text-foreground flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Sede</p>
          </div>
          <div className="p-4 space-y-3">
            <Input placeholder="Regione" value={form.region || ''} onChange={e => { setForm(f => ({ ...f, region: e.target.value })); setShowSaveButton(true); }} disabled={!isEditing} />
            <Input placeholder="Città" value={form.city || ''} onChange={e => { setForm(f => ({ ...f, city: e.target.value })); setShowSaveButton(true); }} disabled={!isEditing} />
          </div>
        </div>

        {/* Contatti */}
        <div className="bg-white rounded-2xl border-2 border-primary/20 shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-secondary" />
          <div className="px-4 py-3 border-b border-border/20">
            <p className="font-semibold text-sm text-foreground flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> Contatti</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input placeholder="Telefono" value={form.phone || ''} onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setShowSaveButton(true); }} disabled={!isEditing} />
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input placeholder="Email" type="email" value={form.email || ''} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setShowSaveButton(true); }} disabled={!isEditing} />
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Input placeholder="Sito web" value={form.website || ''} onChange={e => { setForm(f => ({ ...f, website: e.target.value })); setShowSaveButton(true); }} disabled={!isEditing} />
            </div>
          </div>
        </div>

        {/* Mercati */}
        <div className="bg-white rounded-2xl border-2 border-primary/20 shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-secondary" />
          <div className="px-4 py-3 border-b border-border/20">
            <p className="font-semibold text-sm text-foreground flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Mercati dove vendo</p>
          </div>
          <div className="p-4 space-y-3">
            {/* Mercati selezionati */}
            {(form.market_ids || []).length > 0 && (
              <div className="space-y-3 pb-3 border-b border-border/20">
                <p className="text-xs font-semibold text-primary">I tuoi mercati ({(form.market_ids || []).length})</p>
                {markets
                  .filter(m => (form.market_ids || []).includes(m.id))
                  .map(market => {
                    const schedule = (form.market_schedules || []).find(s => s.market_id === market.id) || {};

                    const updateSchedule = (field, value) => {
                      const schedules = form.market_schedules || [];
                      const existing = schedules.find(s => s.market_id === market.id);
                      const updated = existing
                        ? schedules.map(s => s.market_id === market.id ? { ...s, [field]: value } : s)
                        : [...schedules, { market_id: market.id, days: '', time_start: '', time_end: '', notes: '', [field]: value }];
                      setForm(f => ({ ...f, market_schedules: updated }));
                      setShowSaveButton(true);
                    };

                    return (
                      <div key={market.id} className="rounded-xl border border-primary/40 bg-primary/5 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{market.name}</p>
                            {market.city && <p className="text-xs text-muted-foreground">{market.city}</p>}
                          </div>
                          <button
                            onClick={() => {
                              const ids = form.market_ids || [];
                              setForm(f => ({
                                ...f,
                                market_ids: ids.filter(id => id !== market.id),
                                market_schedules: (f.market_schedules || []).filter(s => s.market_id !== market.id)
                              }));
                              setShowSaveButton(true);
                            }}
                            disabled={!isEditing}
                            className="p-1 hover:bg-destructive/20 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4 text-destructive/60" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <Input
                            placeholder="Giorni (es. Sabato, Domenica)"
                            value={schedule.days || ''}
                            onChange={e => updateSchedule('days', e.target.value)}
                            disabled={!isEditing}
                            className="text-xs h-8"
                          />
                          <div className="flex gap-2">
                            <Input
                              placeholder="Dalle (es. 08:00)"
                              value={schedule.time_start || ''}
                              onChange={e => updateSchedule('time_start', e.target.value)}
                              disabled={!isEditing}
                              className="text-xs h-8"
                            />
                            <Input
                              placeholder="Alle (es. 15:00)"
                              value={schedule.time_end || ''}
                              onChange={e => updateSchedule('time_end', e.target.value)}
                              disabled={!isEditing}
                              className="text-xs h-8"
                            />
                          </div>
                          <Input
                            placeholder="Note (es. solo estate, stand 4...)"
                            value={schedule.notes || ''}
                            onChange={e => updateSchedule('notes', e.target.value)}
                            disabled={!isEditing}
                            className="text-xs h-8"
                          />
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}

            {/* Ricerca e aggiungi nuovi mercati */}
            {isEditing && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-foreground">Aggiungi mercati</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Cerca mercato..."
                    value={marketSearchQuery}
                    onChange={(e) => setMarketSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-border text-sm outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {markets
                    .filter(m => !( form.market_ids || []).includes(m.id) && m.name.toLowerCase().includes(marketSearchQuery.toLowerCase()))
                    .map(market => (
                      <label key={market.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-muted transition-colors">
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => {
                            const ids = form.market_ids || [];
                            setForm(f => ({
                              ...f,
                              market_ids: [...ids, market.id]
                            }));
                            setShowSaveButton(true);
                          }}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{market.name}</p>
                          {market.city && <p className="text-xs text-muted-foreground">{market.city}</p>}
                        </div>
                      </label>
                    ))
                  }
                </div>
              </div>
            )}

            {(form.market_ids || []).length === 0 && !isEditing && (
              <p className="text-xs text-muted-foreground">Nessun mercato selezionato</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {showSaveButton && (
            <motion.div initial={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="flex-1">
              <Button
                className="w-full rounded-2xl h-12 text-base font-semibold gap-2"
                size="lg"
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || !form.name}
              >
                {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Salva azienda
              </Button>
            </motion.div>
          )}
        </div>

        <Button
          variant="destructive"
          className="w-full rounded-2xl h-12 text-base font-semibold gap-2"
          size="lg"
          onClick={() => supabase.auth.signOut()}
        >
          <LogOut className="w-5 h-5" />
          Esci
        </Button>
      </div>
    </div>
  );
}