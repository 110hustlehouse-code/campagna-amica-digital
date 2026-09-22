import { MARCHIO_PROGETTO, MARCHIO_CAMPO_ZERO } from '@/lib/marchi';

/**
 * Lockup istituzionale: marchio del progetto affiancato dal marchio
 * Campo Zero, che ne e' il soggetto tecnico.
 *
 * L'altezza e' in pixel e non in classi Tailwind perche' i due marchi
 * non hanno la stessa forma: il primo e' orizzontale, il secondo e' un
 * tondo. A parita' di altezza il tondo pesa troppo, quindi viene reso
 * all'85%.
 *
 * Il marchio di progetto ha due versioni. Con fondo="scuro" si usa
 * sempre quella chiara; altrimenti il tema decide, con le classi dark:
 * di Tailwind, cosi' la scelta avviene senza leggere il contesto e
 * resta corretta anche se il tema cambia mentre la pagina e' aperta.
 */
export default function Marchi({
  altezza = 40,
  fondo = 'chiaro',
  className = '',
}) {
  const scuro = fondo === 'scuro';
  const stile = { height: altezza, width: 'auto' };

  return (
    <div
      className={`flex items-center ${className}`}
      style={{ gap: Math.round(altezza * 0.45) }}
    >
      {scuro ? (
        <img src={MARCHIO_PROGETTO.srcChiaro} alt={MARCHIO_PROGETTO.alt} style={stile} />
      ) : (
        <>
          <img
            src={MARCHIO_PROGETTO.src}
            alt={MARCHIO_PROGETTO.alt}
            style={stile}
            className="dark:hidden"
          />
          <img
            src={MARCHIO_PROGETTO.srcChiaro}
            alt=""
            aria-hidden="true"
            style={stile}
            className="hidden dark:block"
          />
        </>
      )}

      <div
        className={scuro ? 'bg-white/25' : 'bg-current opacity-20'}
        style={{ width: 1, height: Math.round(altezza * 0.8) }}
      />

      <img
        src={MARCHIO_CAMPO_ZERO.src}
        alt={MARCHIO_CAMPO_ZERO.alt}
        style={{ height: Math.round(altezza * 0.85), width: 'auto' }}
      />
    </div>
  );
}
