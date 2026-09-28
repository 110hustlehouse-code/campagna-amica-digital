import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const RAMPA = ['#eef7f0', '#c3e6cd', '#8ecda1', '#4ea86b', '#1f7a3d'];
const GRIGIO = '#eef0f1';

function coloreValore(v, max) {
  if (!v || v <= 0) return GRIGIO;
  if (max <= 0) return RAMPA[0];
  const q = v / max;
  if (q > 0.75) return RAMPA[4];
  if (q > 0.5) return RAMPA[3];
  if (q > 0.25) return RAMPA[2];
  return RAMPA[1];
}

export default function ItalyMap({ righe, metrica, etichettaMetrica, onSelectRegione }) {
  const [geo, setGeo] = useState(null);

  useEffect(() => {
    let vivo = true;
    fetch('/data/italy-regions.geojson')
      .then((r) => r.json())
      .then((d) => { if (vivo) setGeo(d); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  const perCodice = useMemo(() => {
    const m = new Map();
    (righe || []).forEach((r) => m.set(r.chiave, r));
    return m;
  }, [righe]);

  const max = useMemo(
    () => Math.max(0, ...((righe || []).map((r) => Number(r[metrica]) || 0))),
    [righe, metrica]
  );

  if (!geo) {
    return (
      <div className="h-[380px] rounded-2xl border border-border/50 bg-muted/30 animate-pulse flex items-center justify-center text-sm text-muted-foreground">
        Caricamento mappa...
      </div>
    );
  }

  const style = (feature) => {
    const riga = perCodice.get(feature.properties.reg_istat_code);
    const v = riga ? Number(riga[metrica]) || 0 : 0;
    return { fillColor: coloreValore(v, max), weight: 1, color: '#ffffff', fillOpacity: 0.9 };
  };

  const onEachFeature = (feature, layer) => {
    const riga = perCodice.get(feature.properties.reg_istat_code);
    const nome = feature.properties.reg_name;
    const val = riga ? Number(riga[metrica]) || 0 : 0;
    layer.bindTooltip(
      `<strong>${nome}</strong><br/>${etichettaMetrica}: ${val.toLocaleString('it-IT')}`,
      { sticky: true }
    );
    layer.on({
      mouseover: (e) => e.target.setStyle({ weight: 2, color: '#1f7a3d', fillOpacity: 1 }),
      mouseout: (e) => e.target.setStyle({ weight: 1, color: '#ffffff', fillOpacity: 0.9 }),
      click: () => { if (riga) onSelectRegione(riga); },
    });
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border/50 shadow-sm" style={{ height: 380 }}>
      <MapContainer
        center={[42.3, 12.6]}
        zoom={5.3}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        attributionControl={false}
      >
        <GeoJSON key={metrica} data={geo} style={style} onEachFeature={onEachFeature} />
      </MapContainer>
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow border border-border/50">
        Tocca una regione per scendere di livello
      </div>
    </div>
  );
}
