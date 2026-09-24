import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Building2, ArrowRight } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Marker verde del mercato
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  shadowSize: [41, 41],
});

const greyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Componente che muove la mappa quando c'è userLocation
function FlyToUser({ userLocation }) {
  const map = useMap();
  useEffect(() => {
    if (userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 10, { duration: 1.2 });
    }
  }, [userLocation, map]);
  return null;
}

// Leaflet non si accorge da solo quando il suo contenitore cambia
// dimensione (es. un drawer che si apre sposta/restringe il layout
// dietro di sé) — i tile restano disegnati con le misure vecchie,
// sfasati. Osserviamo il contenitore e ricalcoliamo ogni volta.
function ResizeAware() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export default function MarketsMap({ markets, registeredIds, userLocation }) {
  const [selectedMarket, setSelectedMarket] = useState(null);

  // Solo mercati con coordinate
  const mappable = markets.filter(m => m.latitude && m.longitude);

  const center = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [41.9, 12.5]; // centro Italia

  return (
    <div className="relative z-0 rounded-2xl overflow-hidden border border-border shadow-md" style={{ height: '520px' }}> 
         <MapContainer
        center={center}
        zoom={userLocation ? 10 : 6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <FlyToUser userLocation={userLocation} />
        <ResizeAware />
        
        {mappable.map(market => {
          const count = (market.company_ids || []).filter(id => registeredIds.has(id)).length;
          const isSelected = selectedMarket?.id === market.id;
          const prestoDisponibile = !market.recurring_days || market.recurring_days.length === 0;
          return (
            <Marker
              key={market.id}
              position={[market.latitude, market.longitude]}
              icon={prestoDisponibile ? greyIcon : (isSelected ? selectedIcon : greenIcon)}
              eventHandlers={{ click: () => setSelectedMarket(market) }}
            >
              <Popup
                onClose={() => setSelectedMarket(null)}
                className="market-popup"
              >
                <div className="min-w-[200px]">
                  {market.image_url && (
                    <img
                      src={market.image_url}
                      alt={market.name}
                      className="w-full h-24 object-cover rounded-t mb-2 -mx-2 -mt-2"
                      style={{ width: 'calc(100% + 16px)' }}
                    />
                  )}
                  <p className="font-heading font-bold text-base text-foreground leading-tight">{market.name}</p>
                  {market.city && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                      {market.address ? `${market.address}, ${market.city}` : market.city}
                    </p>
                  )}
                  {market.schedule && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-secondary flex-shrink-0" />
                      {market.schedule}
                    </p>
                  )}
                  {count > 0 && (
                    <p className="text-xs text-primary font-semibold flex items-center gap-1 mt-1">
                      <Building2 className="w-3 h-3 flex-shrink-0" />
                      {count} {count === 1 ? 'azienda' : 'aziende'}
                    </p>
                  )}
                  {prestoDisponibile ? (
                    <div className="mt-3 flex items-center justify-center w-full py-2">
                      <img
                        src="https://otefhryrnajzfyaiwmja.supabase.co/storage/v1/object/public/Badges/Mercato_Presto_Disponibile.png"
                                                alt="Mercato presto disponibile"
                        className="w-16 h-auto"
                      />
                    </div>
                  ) : (
                    <Link
                      to={`/mercati/${market.id}`}
                      className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Visita mercato <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Badge mercati geolocalizzati */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-semibold text-primary shadow border border-primary/10">
        {mappable.length} mercati sulla mappa
      </div>
    </div>
  );
}