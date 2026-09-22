import Marchi from '@/components/shared/Marchi';

/**
 * Footer istituzionale.
 *
 * Porta i soli marchi di proprieta' Campo Zero e la dichiarazione di
 * progetto indipendente: l'app descrive il contesto operativo dei
 * mercati contadini, non rappresenta alcun ente.
 */
export default function Footer() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-4 bg-background/50">
      <Marchi altezza={22} className="opacity-60" />
      <p className="text-muted-foreground text-[10px]">
        © Campagna Amica Digital · Campo Zero
      </p>
      <p className="text-muted-foreground/70 text-[9px] text-center max-w-md leading-snug">
        Progetto indipendente in fase di sviluppo. Non implica affiliazione
        o rappresentanza di enti terzi.
      </p>
    </div>
  );
}
