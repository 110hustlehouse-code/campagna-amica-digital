import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyCompany } from '@/api/companies';
import { getProductsByCompany, createProduct, updateProduct, deleteProduct, deleteProducts } from '@/api/products';
import { uploadFile } from '@/api/storage';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Edit2, ToggleLeft, ToggleRight, Loader2, AlertTriangle, Package, ImageIcon, Award, Leaf, Boxes, Search, X, Truck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';

const CATEGORIES = ['frutta','verdura','formaggi','salumi','olio','vino','miele','pane_pasta','conserve','altro'];
const UNITS = ['kg','lt','pz','confezione'];
const emptyProduct = { name: '', description: '', price: '', unit: 'kg', category: 'altro', image_url: '', available: true };
const CATEGORY_EMOJI = { frutta:'🍎', verdura:'🥦', formaggi:'🧀', salumi:'🥩', olio:'🫒', vino:'🍷', miele:'🍯', pane_pasta:'🍞', conserve:'🫙', altro:'🌿' };

export default function ProducerProducts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editProduct, setEditProduct] = useState(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1') setEditProduct({ ...emptyProduct });
  }, []);

  const { data: myCompany } = useQuery({
    queryKey: ['my-company', user?.email],
    queryFn: getMyCompany,
    enabled: !!user?.email,
    select: d => d[0],
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['my-products', myCompany?.id],
    queryFn: () => getProductsByCompany(myCompany.id),
    enabled: !!myCompany?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (p) => {
      const data = { ...p, price: parseFloat(p.price) || 0, company_id: myCompany.id };
      return p.id ? updateProduct(p.id, data) : createProduct(data);
    },
    onSuccess: () => { qc.invalidateQueries(['my-products']); setEditProduct(null); toast({ title: 'Salvato!' }); },
  });

  const toggleMutation = useMutation({
    mutationFn: (p) => updateProduct(p.id, { available: !p.available }),
    onSuccess: () => qc.invalidateQueries(['my-products']),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => qc.invalidateQueries(['my-products']),
    onError: (err) => {
      if (err.message.includes('not found')) {
        qc.invalidateQueries(['my-products']);
        toast({ title: 'Prodotto non trovato', variant: 'destructive' });
      }
    },
  });

  const clearAll = async () => {
    await deleteProducts(products.map(p => p.id));
    qc.invalidateQueries(['my-products']);
    setShowConfirmClear(false);
    toast({ title: 'Listino svuotato' });
  };

  const handleImageUpload = async (file) => {
    setUploading(true);
    const { file_url } = await uploadFile(file, 'prodotti');
    setEditProduct(prev => ({ ...prev, image_url: file_url }));
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

  const active = products.filter(p => p.available !== false).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Page header — Coldiretti branded */}
       <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-primary/20 px-5 pt-12 pb-5">
         <div className="flex items-start justify-between gap-4 mb-4">
           <div>
             <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-2">
               <Award className="w-3.5 h-3.5 text-primary" />
               <span className="text-primary text-xs font-bold uppercase tracking-widest">Listino Certificato Coldiretti</span>
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
             <Link to="/produttore/disponibilita">
               <Boxes className="w-4 h-4" /> Disponibilità
             </Link>
           </Button>
         </div>
       </div>

      <div className="px-5 pt-4 pb-24 space-y-4">
        {/* Search bar */}
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
              <Button onClick={() => setEditProduct({ ...emptyProduct })} className="rounded-xl gap-1">
                <Plus className="w-4 h-4" /> Aggiungi
              </Button>
              <Button asChild variant="outline" className="rounded-xl gap-1">
                <Link to="/produttore/listino-ai">✨ Listino AI</Link>
              </Button>
            </div>
          </div>
        ) : (
          products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border-2 border-primary/20 shadow-sm overflow-hidden transition-all hover:shadow-md ${!p.available ? 'opacity-50' : ''}`}
            >
              <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/80 to-secondary" />
              <div className="flex items-center gap-3 p-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center text-2xl border border-primary/20">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    : <span>{CATEGORY_EMOJI[p.category] || '🌿'}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate flex items-center gap-2">
                    {p.name}
                    {p.available && <Award className="w-3 h-3 text-primary flex-shrink-0" />}
                  </p>
                  <p className="text-xs mt-0.5">
                    <span className="font-bold text-primary">€{p.price}</span>
                    <span className="text-muted-foreground">/{p.unit} · {p.category.replace('_', ' ')}</span>
                  </p>
                  {p.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>}
                </div>
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => toggleMutation.mutate(p)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    {p.available !== false
                      ? <ToggleRight className="w-5 h-5 text-primary" />
                      : <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                    }
                  </button>
                  <button onClick={() => setEditProduct({ ...p })} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
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
          <DialogContent className="max-w-md mx-4 rounded-2xl">
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
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleImageUpload(e.target.files[0])} />
              </label>
              <Input placeholder="Nome prodotto *" value={editProduct.name} onChange={e => setEditProduct(p => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Descrizione" value={editProduct.description || ''} onChange={e => setEditProduct(p => ({ ...p, description: e.target.value }))} />
              <div className="flex gap-2">
                <Input placeholder="Prezzo (€)" type="number" value={editProduct.price} onChange={e => setEditProduct(p => ({ ...p, price: e.target.value }))} className="flex-1" />
                <Select value={editProduct.unit} onValueChange={v => setEditProduct(p => ({ ...p, unit: v }))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Select value={editProduct.category} onValueChange={v => setEditProduct(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_EMOJI[c]} {c.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
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