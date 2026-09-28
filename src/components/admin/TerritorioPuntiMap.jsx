import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';

const RAMPA = ['#c3e6cd', '#8ecda1', '#4ea86b', '#1f7a3d'];

function coloreValore(v, max) {
  if (!v || v <= 0 || max <= 0) return RAMPA[0];
  const q = v / max;
  if (q > 0.75) return RAMPA[3];
  if (q > 0.5) return RAMPA[2];
  return RAMPA[1];
}
function raggioValore(v, max) {
  if (!v || v <= 0 || max <= 0) return 10;
  return 10 + Math.round((v / max) * 18);
}

function FitBounds({ punti }) {
  const map = useMap();
  useEffect(() => {
    if (punti.length === 0) return;
    if (punti.length === 1) {
      map.setView([punti[0].lat, punti[0].lon], 13);
      return;
    }
    map.fitBounds(punti.map((p) => [p.lat, p.lon]), { padding: [32, 32] });
  }, [punti, map]);
  return null;
}

export default function TerritorioPuntiMap({ righe, metrica, etichettaMetrica, onSelectRiga, cliccabile }) {
  const punti = useMemo(
    () => (righe || []).filter((r) => r.lat != null && r.lon != null),
    [righe]
  );
  const max = useMemo(
    () => Math.max(0, ...punti.map((r) => Number(r[metrica]) || 0)),
    [punti, metrica]
  );

  if (punti.length === 0) {
    return (
      <div className="h-[320px] rounded-2xl border border-border/50 bg-muted/30 flex items-center justify-center text-sm text-muted-foreground text-center px-6">
        Nessuna coordinata disponibile per questo territorio.
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-sm" style={{ height: 320 }}>
      <MapContainer
        center={[punti[0].lat, punti[0].lon]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <FitBounds punti={punti} />
        {punti.map((r) => {
          const v = Number(r[metrica]) || 0;
          return (
            <CircleMarker
              key={r.chiave}
              center={[r.lat, r.lon]}
              radius={raggioValore(v, max)}
              pathOptions={{ fillColor: coloreValore(v, max), color: '#ffffff', weight: 2, fillOpacity: 0.9 }}
              eventHandlers={cliccabile ? { click: () => onSelectRiga(r) } : {}}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <strong>{r.nome}</strong><br />{etichettaMetrica}: {v.toLocaleString('it-IT')}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
