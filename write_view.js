Note: The tool simplified the command to `node -e "
const fs = require('fs');
const f = 'c:/Users/Alexa/Documents/GitHub/Gestor_Viviendas_TFG/views/prediccion/venta_predict_result.ejs';
const content = \`<!DOCTYPE html>
<html lang=\"es\">
<head>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <title>Resultado Predicción de Venta</title>
  <link href=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css\" rel=\"stylesheet\">
  <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css\">
  <link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css\">
  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">
  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>
  <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap\" rel=\"stylesheet\">
  <link rel=\"stylesheet\" href=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.css\"/>
  <link rel=\"stylesheet\" href=\"/css/navbar.css\">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #F4F6F9; color: #0F172A; margin: 0; }
    .vr-page { max-width: 1340px; margin: 0 auto; padding: 2rem 1.75rem 3rem; }
    .vr-hero-card {
      background: #fff; border-radius: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
      padding: 2rem 2rem 1.75rem;
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: 1.5rem; margin-bottom: 1.5rem;
    }
    .vr-hero-label {
      font-size: .68rem; font-weight: 700; letter-spacing: .12em;
      text-transform: uppercase; color: #64748b;
      display: flex; align-items: center; gap: .4rem;
    }
    .vr-hero-label i { color: #10B981; }
    .vr-price {
      font-size: 3rem; font-weight: 900;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      line-height: 1; margin: .4rem 0;
    }
    .vr-price-sub { font-size: .85rem; color: #64748b; }
    .vr-model-pill {
      display: inline-block; padding: 4px 14px; border-radius: 20px;
      font-size: .75rem; font-weight: 700;
      background: #EFF6FF; color: #3B82F6; border: 1px solid #BFDBFE; margin-top: .5rem;
    }
    .vr-hero-chips { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; }
    .vr-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 13px; border-radius: 20px; font-size: .78rem; font-weight: 600;
      background: #F1F5F9; color: #334155; border: 1px solid #E2E8F0;
    }
    .vr-chip i { color: #10B981; font-size: .8rem; }
    .vr-body { display: grid; grid-template-columns: 400px 1fr; gap: 1.5rem; }
    @media (max-width: 960px) { .vr-body { grid-template-columns: 1fr; } }
    .vr-panel { display: flex; flex-direction: column; gap: 1.25rem; }
    .vr-card {
      background: #fff; border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08); padding: 1.25rem 1.375rem;
    }
    .vr-section {
      font-size: .7rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .08em; color: #64748b;
      display: flex; align-items: center; gap: 7px;
      border-bottom: 1.5px solid #F1F5F9; padding-bottom: 10px; margin-bottom: 12px;
    }
    .vr-section i { color: #10B981; font-size: .85rem; }
    .vr-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .vr-detail-item {
      display: flex; align-items: center; gap: 7px;
      padding: 9px 12px; background: #F8FAFC;
      border-radius: 8px; border: 1px solid #E2E8F0;
      font-size: .82rem; color: #334155;
    }
    .vr-detail-item i { color: #3B82F6; font-size: .9rem; min-width: 16px; flex-shrink: 0; }
    .vr-detail-item .lbl { color: #64748b; margin-right: 3px; }
    .vr-amenities { display: flex; flex-wrap: wrap; gap: 7px; }
    .vr-amenity {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 11px; border-radius: 20px; font-size: .78rem; font-weight: 600;
      background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0;
    }
    .vr-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: .75rem; }
    .vr-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: .85rem;
      text-decoration: none; transition: all .15s; cursor: pointer; border: none;
    }
    .vr-btn-primary { background: #10B981; color: #fff; box-shadow: 0 4px 14px rgba(16,185,129,.3); }
    .vr-btn-primary:hover { background: #059669; color: #fff; }
    .vr-btn-outline { background: #fff; color: #334155; border: 1.5px solid #E2E8F0; }
    .vr-btn-outline:hover { background: #F1F5F9; }
    .vr-map-card {
      background: #fff; border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
      overflow: hidden; position: relative; min-height: 520px;
    }
    #vr-map { width: 100%; height: 100%; min-height: 520px; }
    .vr-map-overlay {
      position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
      background: rgba(255,255,255,.95); backdrop-filter: blur(8px);
      border: 1px solid #E2E8F0; border-radius: 12px;
      padding: 9px 16px; font-size: .82rem; font-weight: 600; color: #334155;
      display: flex; align-items: center; gap: 7px; z-index: 999;
      white-space: nowrap; max-width: calc(100% - 28px);
      overflow: hidden; text-overflow: ellipsis;
      box-shadow: 0 2px 8px rgba(0,0,0,.1);
    }
    .vr-map-overlay i { color: #10B981; }
    .vr-error {
      max-width: 560px; margin: 80px auto; padding: 40px 32px;
      background: #fff; border: 1px solid #E2E8F0; border-radius: 16px;
      text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.08);
    }
    .vr-error i { font-size: 2.5rem; color: #EF4444; }
    .vr-error h3 { margin: 12px 0 8px; font-size: 1.3rem; color: #0F172A; }
    .vr-error p { color: #64748b; font-size: .9rem; }
  </style>
</head>
<body>
  <%- include('../partials/navbar') %>

  <% if (sample) { %>
  <%
    const amenityMeta = {
      garage:           { icon: 'bi-car-front',         text: 'Garaje' },
      terrace:          { icon: 'bi-brightness-high',   text: 'Terraza' },
      garden:           { icon: 'bi-tree',              text: 'Jardín' },
      swimming_pool:    { icon: 'bi-water',             text: 'Piscina' },
      lift:             { icon: 'bi-arrow-up-square',   text: 'Ascensor' },
      balcony:          { icon: 'bi-columns-gap',       text: 'Balcón' },
      air_conditioner:  { icon: 'bi-snow',              text: 'Aire acondicionado' },
      built_in_wardrobe:{ icon: 'bi-box-seam',          text: 'Armarios empotrados' },
      chimney:          { icon: 'bi-fire',              text: 'Chimenea' },
      storage_room:     { icon: 'bi-archive',           text: 'Trastero' },
      reduced_mobility: { icon: 'bi-person-wheelchair', text: 'Accesible' },
      unfurnished:      { icon: 'bi-dash-circle',       text: 'Sin amueblar' }
    };
    const activeAmenities = Object.entries(amenityMeta).filter(([k]) => sample.input[k] == 1);
  %>

  <div class=\"vr-page\">
    <div class=\"vr-hero-card\">
      <div>
        <div class=\"vr-hero-label\"><i class=\"bi bi-house-door\"></i> Precio estimado de venta</div>
        <div class=\"vr-price\">
          <%= typeof sample.price === 'number'
            ? sample.price.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
            : sample.price %> <%= sample.currency %>
        </div>
        <div class=\"vr-price-sub\">Estimación basada en modelo predictivo</div>
        <span class=\"vr-model-pill\"><%= sample.modelo %></span>
        <div class=\"vr-actions\">
          <a href=\"/venta\" class=\"vr-btn vr-btn-primary\"><i class=\"bi bi-arrow-repeat\"></i> Nueva predicción</a>
          <a href=\"/dashboard\" class=\"vr-btn vr-btn-outline\"><i class=\"bi bi-arrow-left\"></i> Volver</a>
        </div>
      </div>
      <div class=\"vr-hero-chips\">
        <span class=\"vr-chip\"><i class=\"bi bi-building\"></i> <%= sample.input.loc_city ; 'N/A' %></span>
        <span class=\"vr-chip\"><i class=\"bi bi-house\"></i> <%= sample.input.house_type %></span>
        <span class=\"vr-chip\"><i class=\"bi bi-arrows-fullscreen\"></i> <%= sample.input.m2_useful %> m²</span>
        <span class=\"vr-chip\"><i class=\"bi bi-door-closed\"></i> <%= sample.input.room_num %> hab.</span>
        <span class=\"vr-chip\"><i class=\"bi bi-droplet\"></i> <%= sample.input.bath_num %> baños</span>
      </div>
    </div>

    <div class=\"vr-body\">
      <div class=\"vr-panel\">
        <div class=\"vr-card\">
          <div class=\"vr-section\"><i class=\"bi bi-geo-alt\"></i> Ubicación</div>
          <div class=\"vr-detail-grid\">
            <div class=\"vr-detail-item\"><i class=\"bi bi-building\"></i><span class=\"lbl\">Ciudad:</span><%= sample.input.loc_city ; '—' %></div>
            <% if (sample.input.loc_zone) { %><div class=\"vr-detail-item\"><i class=\"bi bi-pin-map\"></i><span class=\"lbl\">Zona:</span><%= sample.input.loc_zone %></div><% } %>
            <% if (sample.input.loc_district) { %><div class=\"vr-detail-item\"><i class=\"bi bi-signpost-2\"></i><span class=\"lbl\">Distrito:</span><%= sample.input.loc_district %></div><% } %>
            <% if (sample.input.loc_neigh) { %><div class=\"vr-detail-item\"><i class=\"bi bi-houses\"></i><span class=\"lbl\">Barrio:</span><%= sample.input.loc_neigh %></div><% } %>
          </div>
        </div>
        <div class=\"vr-card\">
          <div class=\"vr-section\"><i class=\"bi bi-list-check\"></i> Características</div>
          <div class=\"vr-detail-grid\">
            <div class=\"vr-detail-item\"><i class=\"bi bi-house\"></i><span class=\"lbl\">Tipo:</span><%= sample.input.house_type %></div>
            <div class=\"vr-detail-item\"><i class=\"bi bi-arrows-fullscreen\"></i><span class=\"lbl\">m² útiles:</span><%= sample.input.m2_useful %></div>
            <div class=\"vr-detail-item\"><i class=\"bi bi-bounding-box\"></i><span class=\"lbl\">m² constr.:</span><%= sample.input.m2_real %></div>
            <div class=\"vr-detail-item\"><i class=\"bi bi-door-closed\"></i><span class=\"lbl\">Habitaciones:</span><%= sample.input.room_num %></div>
            <div class=\"vr-detail-item\"><i class=\"bi bi-droplet\"></i><span class=\"lbl\">Baños:</span><%= sample.input.bath_num %></div>
            <div class=\"vr-detail-item\"><i class=\"bi bi-layers\"></i><span class=\"lbl\">Planta:</span><%= sample.input.floor %></div>
            <% if (sample.input.ground_size > 0) { %><div class=\"vr-detail-item\"><i class=\"bi bi-textarea-resize\"></i><span class=\"lbl\">Parcela:</span><%= sample.input.ground_size %> m²</div><% } %>
            <div class=\"vr-detail-item\"><i class=\"bi bi-calendar3\"></i><span class=\"lbl\">Año:</span><%= sample.input.construct_date %></div>
            <div class=\"vr-detail-item\"><i class=\"bi bi-tools\"></i><span class=\"lbl\">Estado:</span><%= sample.input.condition %></div>
            <div class=\"vr-detail-item\"><i class=\"bi bi-lightning-charge\"></i><span class=\"lbl\">Energía:</span><%= sample.input.energetic_certif %></div>
            <div class=\"vr-detail-item\"><i class=\"bi bi-thermometer-half\"></i><span class=\"lbl\">Calefacción:</span><%= sample.input.heating %></div>
            <div class=\"vr-detail-item\"><i class=\"bi bi-compass\"></i><span class=\"lbl\">Orientación:</span><%= sample.input.orientation %></div>
          </div>
        </div>
        <% if (activeAmenities.length) { %>
        <div class=\"vr-card\">
          <div class=\"vr-section\"><i class=\"bi bi-stars\"></i> Servicios incluidos</div>
          <div class=\"vr-amenities\">
            <% activeAmenities.forEach(([k, v]) => { %>
              <span class=\"vr-amenity\"><i class=\"bi <%= v.icon %>\"></i> <%= v.text %></span>
            <% }); %>
          </div>
        </div>
        <% } %>
      </div>

      <div class=\"vr-map-card\">
        <div id=\"vr-map\"></div>
        <div class=\"vr-map-overlay\" id=\"mapLabel\">
          <i class=\"bi bi-geo-alt-fill\"></i>
          <span><%= locationStr ; 'Ubicación no especificada' %></span>
        </div>
      </div>
    </div>
  </div>

  <% } else { %>
  <div class=\"vr-page\">
    <div class=\"vr-error\">
      <i class=\"bi bi-exclamation-triangle\"></i>
      <h3>Error en la predicción</h3>
      <p><%= error ; 'No se pudo calcular el precio de venta.' %></p>
      <div class=\"vr-actions\" style=\"justify-content:center; margin-top:20px;\">
        <a href=\"/venta\" class=\"vr-btn vr-btn-primary\"><i class=\"bi bi-arrow-repeat\"></i> Reintentar</a>
        <a href=\"/dashboard\" class=\"vr-btn vr-btn-outline\"><i class=\"bi bi-arrow-left\"></i> Volver</a>
      </div>
    </div>
  </div>
  <% } %>

  <script src=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.js\"></script>
  <script>
    <% if (sample) { %>
    const locationQuery = '<%= locationStr.replace(/\\'/g, \"\\\\'\" ) %>';

    const map = L.map('vr-map', { zoomControl: true, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    const markerIcon = L.divIcon({
      html: \\\`<div style=\"width:32px;height:32px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#10B981,#059669);transform:rotate(-45deg);box-shadow:0 4px 12px rgba(16,185,129,.45);border:3px solid #fff;\"></div>\\\`,
      iconSize: [32, 32], iconAnchor: [16, 32], className: ''
    });

    if (locationQuery.trim()) {
      fetch(\\\`https://nominatim.openstreetmap.org/search?q=\\\${encodeURIComponent(locationQuery + ', España')};&format=json;&limit=1\\\`, {
        headers: { 'Accept-Language': 'es' }
      })
      .then(r => r.json())
      .then(data => {
        if (data ; data.length > 0) {
          map.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 14);
          L.marker([parseFloat(data[0].lat), parseFloat(data[0].lon)], { icon: markerIcon })
            .addTo(map)
            .bindPopup('<strong><%= (sample.input.loc_city || "").replace(/\\'/g, "\\\\'") %></strong><br><%= locationStr.replace(/\\'/g, "\\\\'") %>')
            .openPopup();
        } else {
          map.setView([40.416775, -3.703790], 6);
          document.getElementById('mapLabel').innerHTML = '<i class=\"bi bi-geo-alt\"></i><span>Ubicación no encontrada en el mapa</span>';
        }
      })
      .catch(() => map.setView([40.416775, -3.703790], 6));
    } else {
      map.setView([40.416775, -3.703790], 6);
      document.getElementById('mapLabel').innerHTML = '<i class=\"bi bi-geo-alt\"></i><span>Sin ubicación especificada</span>';
    }
    <% } %>
  </script>
</body>
</html>\`;
fs.writeFileSync(f, content, 'utf8');
console.log('Written', fs.statSync(f).size, 'bytes');
"
`, and this is the output of running that command instead:
En línea: 15 Carácter: 91
+ ... oogleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display= ... 
+                                                                 ~
Token '&' inesperado en la expresión o la instrucción.
En línea: 200 Carácter: 56
+               <span class=\"vr-amenity\"><i class=\"bi <%= v.icon %>\ ...     
+                                                        ~
El operador '<' está reservado para uso futuro.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordEx  
   ception
    + FullyQualifiedErrorId : UnexpectedToken

