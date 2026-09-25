import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyCompany } from '@/api/companies';
import { getProductsByCompany, createProduct, updateProduct, deleteProduct, deleteProducts } from '@/api/products';
import { getResellerPrices, setResellerPrice, removeResellerPrice } from '@/api/resellers';
import { uploadFile } from '@/api/storage';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Trash2, Edit2, ToggleLeft, ToggleRight, Loader2, AlertTriangle, Package,
  ImageIcon, Award, Leaf, FileText, Search, X, Truck, Store, ChevronDown, ChevronUp, Check,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

const CATEGORIES = [
  'frutta', 'verdura', 'formaggi', 'salumi', 'carne', 'pesce', 'olio', 'vino', 'birra',
  'miele', 'pane_pasta', 'dolci_pasticceria', 'uova', 'cereali_legumi', 'conserve', 'erbe_spezie', 'altro',
];
const UNITS = ['kg', 'lt', 'pz', 'confezione'];
const VAT_RATES = [4, 10, 22];

const CATEGORY_EMOJI = {
  frutta: '🍎', verdura: '🥦', formaggi: '🧀', salumi: '🥩', carne: '🥩', pesce: '🐟',
  olio: '🫒', vino: '🍷', birra: '🍺', miele: '🍯', pane_pasta: '🍞', dolci_pasticceria: '🧁',
  uova: '🥚', cereali_legumi: '🌾', conserve: '🫙', erbe_spezie: '🌿', altro: '🌿',
};

// I 14 allergeni del Reg. UE 1169/2011 — uguali per legge per chiunque venda alimenti.
const ALLERGENI = [
  { key: 'contains_gluten', label: 'Glutine' },
  { key: 'contains_crustaceans', label: 'Crostacei' },
  { key: 'contains_eggs', label: 'Uova' },
  { key: 'contains_fish', label: 'Pesce' },
  { key: 'contains_peanuts', label: 'Arachidi' },
  { key: 'contains_soy', label: 'Soia' },
  { key: 'contains_milk', label: 'Latte' },
  { key: 'contains_nuts', label: 'Frutta a guscio' },
  { key: 'contains_celery', label: 'Sedano' },
  { key: 'contains_mustard', label: 'Senape' },
  { key: 'contains_sesame', label: 'Sesamo' },
  { key: 'contains_sulphites', label: 'Solfiti' },
  { key: 'contains_lupin', label: 'Lupini' },
  { key: 'contains_molluscs', label: 'Molluschi' },
];

const emptyProduct = {
  name: '', description: '', price: '', unit: 'kg', category: 'altro', image_url: '', available: true,
  code: '', ingredients: '', box_configs: '', vat_rate: 10,
  price_list1: '', price_list2: '',
  ...Object.fromEntries(ALLERGENI.map((a) => [a.key, false])),
};

export default function ProducerProducts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editProduct, setEditProduct] = useState(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mostraAvanzate, setMostraAvanzate] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1') setEditProduct({ ...emptyProduct });
  }, []);

  const { data: myCompany } = useQuery({
    queryKey: ['my-company', user?.email],
    queryFn: getMyCompany,
    enabled: !!user?.email,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['my-products', myCompany?.id],
    queryFn: () => getProductsByCompany(myCompany.id),
    enabled: !!myCompany?.id,
    refetchOnMount: 'always',
  });

  // Apre un prodotto esistente: carica anche i suoi prezzi rivenditore,
  // che vivono in una tabella separata (mai pubblica, a differenza di products).
  const apriModifica = async (p) => {
    setMostraAvanzate(false);
    let priceList1 = '';
    let priceList2 = '';
    try {
      const prezzi = await getResellerPrices(p.id);
      priceList1 = prezzi.find((x) => x.pricelist_id === 1)?.price ?? '';
      priceList2 = prezzi.find((x) => x.pricelist_id === 2)?.price ?? '';
    } catch {
      // Nessun prezzo impostato, o errore di rete: si apre comunque il form, vuoto.
    }
    setEditProduct({ ...emptyProduct, ...p, price_list1: priceList1, price_list2: priceList2 });
  };

  const saveMutation = useMutation({
    mutationFn: async (p) => {
      const { price_list1, price_list2, ...resto } = p;
      const data = { ...resto, price: parseFloat(p.price) || 0, vat_rate: Number(p.vat_rate) || 10, company_id: myCompany.id };
      const saved = p.id ? await updateProduct(p.id, data) : await createProduct(data);

      // Prezzi rivenditore: campo vuoto = niente prezzo per quel listino (il prodotto
      // non compare nel catalogo di quel listino, non è un prezzo a zero).
      for (const [listino, valore] of [[1, price_list1], [2, price_list2]]) {
        if (valore === '' || valore === null || valore === undefined) {
          await removeResellerPrice(saved.id, listino);
        } else {
          await setResellerPrice(saved.id, listino, Number(valore));
        }
      }
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-products'] });
      setEditProduct(null);
      toast({ title: 'Salvato!' });
    },
    onError: (e) => toast({ title: 'Errore', description: e.message, variant: 'destructive' }),
  });

  const toggleMutation = useMutation({
    mutationFn: (p) => updateProduct(p.id, { available: !p.available }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-products'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-products'] }),
    onError: (err) => {
      if (err.message.includes('not found')) {
        qc.invalidateQueries({ queryKey: ['my-products'] });
        toast({ title: 'Prodotto non trovato', variant: 'destructive' });
      }
    },
  });

  const clearAll = async () => {
    try {
      await deleteProducts(products.map((p) => p.id));
      qc.invalidateQueries({ queryKey: ['my-products'] });
      toast({ title: 'Listino svuotato' });
    } catch (err) {
      toast({ title: 'Errore', description: err.message, variant: 'destructive' });
    } finally {
      setShowConfirmClear(false);
    }
  };

  const handleImageUpload = async (file) => {
    setUploading(true);
    const { file_url } = await uploadFile(file, 'prodotti');
    setEditProduct((prev) => ({ ...prev, image_url: file_url }));
    setUploading(false);
  };

  if (!myCompany) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Package className="w-8 h-8 text-primary" />
      </div>
      <p className="text-muted-foreground mb-4">Completa prima il profilo azienda.</p>
      <Button asChild><Link to="/produttore/azienda">Vai al profilo</Link></Button>
    </div>
  );

  const active = products.filter((p) => p.available !== false).length;
    return (
    <div className="min-h-screen bg-background">
      {/* Intestazione pagina */}
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-primary/20 px-5 pt-12 pb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-2">
              <Award className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary text-xs font-bold uppercase tracking-widest">Listino prodotti</span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Il mio Catalogo</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirmClear(true)}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground" />
            </button>
            <Button asChild variant="outline" className="rounded-xl gap-1">
              <Link to="/produttore/fornitori">
                <Truck className="w-4 h-4" /> Fornitori
              </Link>
            </Button>

          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Leaf className="w-3.5 h-3.5 text-primary" />
            {active} attivi · {products.length} totali
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-lg gap-1">
            <Link to="/produttore/ddt">
              <FileText className="w-4 h-4" /> DDT
            </Link>
          </Button>
        </div>
      </div>

      <div className="px-5 pt-4 pb-24 space-y-4">
        {products.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cerca prodotto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-border bg-white text-sm outline-none focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">🌿</p>
            <p className="font-semibold text-foreground">Nessun prodotto ancora</p>
            <p className="text-sm text-muted-foreground mt-1 mb-5">Aggiungi prodotti manualmente o importa un listino con l'AI</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => { setMostraAvanzate(false); setEditProduct({ ...emptyProduct }); }} className="rounded-xl gap-1">
                <Plus className="w-4 h-4" /> Aggiungi
              </Button>
              <Button asChild variant="outline" className="rounded-xl gap-1">
                <Link to="/produttore/listino-ai">✨ Listino AI</Link>
              </Button>
            </div>
          </div>
        ) : (
          products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((p) => (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border-2 border-primary/20 shadow-sm overflow-hidden transition-all hover:shadow-md ${!p.available ? 'opacity-50' : ''}`}
            >
              <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-secondary" />
              <div className="flex items-center gap-3 p-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center text-2xl border border-primary/20">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    : <span>{CATEGORY_EMOJI[p.category] || '🌿'}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate flex items-center gap-2">
                    {p.name}
                    {p.available && <Award className="w-3 h-3 text-primary flex-shrink-0" />}
                  </p>
                  <p className="text-xs mt-0.5">
                    <span className="font-bold text-primary">€{p.price}</span>
                    <span className="text-muted-foreground">/{p.unit} · {p.category?.replace('_', ' ')}</span>
                    {p.code && <span className="text-muted-foreground"> · cod. {p.code}</span>}
                  </p>
                  {p.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>}
                </div>
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => toggleMutation.mutate(p)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    {p.available !== false
                      ? <ToggleRight className="w-5 h-5 text-primary" />
                      : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                  </button>
                  <button onClick={() => apriModifica(p)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-destructive/60" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit/Add Dialog */}
      {editProduct && (
        <Dialog open onOpenChange={() => setEditProduct(null)}>
          <DialogContent className="max-w-md mx-4 rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">{editProduct.id ? 'Modifica prodotto' : 'Nuovo prodotto'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {editProduct.image_url ? (
                <img src={editProduct.image_url} alt="" className="w-full h-36 object-cover rounded-xl" />
              ) : (
                <div className="w-full h-24 rounded-xl bg-muted flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer text-sm text-primary font-medium">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {uploading ? 'Caricamento...' : 'Carica foto prodotto'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])} />
              </label>

              <Input placeholder="Nome prodotto *" value={editProduct.name} onChange={(e) => setEditProduct((p) => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Descrizione" value={editProduct.description || ''} onChange={(e) => setEditProduct((p) => ({ ...p, description: e.target.value }))} />

              <div className="flex gap-2">
                <Input placeholder="Prezzo al pubblico (€)" type="number" value={editProduct.price} onChange={(e) => setEditProduct((p) => ({ ...p, price: e.target.value }))} className="flex-1" />
                <Select value={editProduct.unit} onValueChange={(v) => setEditProduct((p) => ({ ...p, unit: v }))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <Select value={editProduct.category} onValueChange={(v) => setEditProduct((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_EMOJI[c]} {c.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* --------------------------------------- sezione avanzata */}
              <button
                type="button"
                onClick={() => setMostraAvanzate((v) => !v)}
                className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground py-2 border-t border-border/40"
              >
                <span>Dettagli avanzati (codice, ingredienti, allergeni, listini rivenditori)</span>
                {mostraAvanzate ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {mostraAvanzate && (
                <div className="space-y-3 pt-1">
                  <div className="flex gap-2">
                    <Input placeholder="Codice interno" value={editProduct.code || ''} onChange={(e) => setEditProduct((p) => ({ ...p, code: e.target.value }))} className="flex-1" />
                    <Select value={String(editProduct.vat_rate ?? 10)} onValueChange={(v) => setEditProduct((p) => ({ ...p, vat_rate: v }))}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>{VAT_RATES.map((r) => <SelectItem key={r} value={String(r)}>{r}% IVA</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <Textarea
                    placeholder="Ingredienti"
                    rows={2}
                    value={editProduct.ingredients || ''}
                    onChange={(e) => setEditProduct((p) => ({ ...p, ingredients: e.target.value }))}
                    className="resize-none"
                  />

                  <Input
                    placeholder="Formato di vendita (es. 5pz×250g)"
                    value={editProduct.box_configs || ''}
                    onChange={(e) => setEditProduct((p) => ({ ...p, box_configs: e.target.value }))}
                  />

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Allergeni (Reg. UE 1169/2011)</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ALLERGENI.map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setEditProduct((p) => ({ ...p, [key]: !p[key] }))}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                            editProduct[key] ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-card border-border text-muted-foreground'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${editProduct[key] ? 'bg-destructive border-destructive' : 'border-border'}`}>
                            {editProduct[key] && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Prezzi rivenditore — vuoto significa che il prodotto non compare in quel listino
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block">Listino 1 (€)</label>
                        <Input
                          type="number" step="0.01" placeholder="—"
                          value={editProduct.price_list1}
                          onChange={(e) => setEditProduct((p) => ({ ...p, price_list1: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block">Listino 2 (€)</label>
                        <Input
                          type="number" step="0.01" placeholder="—"
                          value={editProduct.price_list2}
                          onChange={(e) => setEditProduct((p) => ({ ...p, price_list2: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 mt-1">
              <Button variant="outline" onClick={() => setEditProduct(null)}>Annulla</Button>
              <Button onClick={() => saveMutation.mutate(editProduct)} disabled={saveMutation.isPending || !editProduct.name}>
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salva prodotto'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showConfirmClear} onOpenChange={setShowConfirmClear}>
        <DialogContent className="max-w-sm mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Svuota listino
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">Sei sicuro? Questa azione eliminerà tutti i <strong>{products.length}</strong> prodotti in modo permanente.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmClear(false)}>Annulla</Button>
            <Button variant="destructive" onClick={clearAll}>Sì, svuota tutto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}