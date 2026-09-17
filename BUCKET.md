# Creare i bucket di Supabase Storage

Servono per il caricamento di immagini e allegati.

Su Supabase → **Storage** → **New bucket**, creane quattro, tutti
marcati **Public bucket**:

| Nome | Contenuto |
|---|---|
| `prodotti` | foto dei prodotti |
| `aziende` | loghi e copertine delle aziende |
| `mercati` | immagini dei mercati |
| `allegati` | allegati delle comunicazioni, listini caricati |

Sono pubblici perché queste immagini sono destinate a essere viste da
chiunque usi l'app.

I documenti riservati — firme dei DDT, ricevute di pagamento — andranno
in un bucket **privato** con link a scadenza. Lo creeremo insieme alla
parte DDT, non serve ora.
