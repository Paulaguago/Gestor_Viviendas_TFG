const fs = require('fs');
const path = require('path');

// Base path for the project root
const projectRoot = path.join(__dirname, '..');

// Utilidad: leer JSON prefiriendo nuevas subcarpetas (model/ebm | model/rf) y con fallback al path legacy
function readJsonPrefer(paths) {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[WARN] No se pudo leer', p, e.message);
    }
  }
  return null;
}

// Cargar opciones del modelo (con fallback a ruta en modelos_predictivos)
const options = readJsonPrefer([
  path.join(projectRoot, 'model', 'model_options.json'),
  path.join(projectRoot, 'modelos_predictivos', 'alquiler', 'data', 'model_options.json')
]) || {};

// Cargar estadísticas/amenities por ciudad (limpio y agrupado)
const stats = readJsonPrefer([
  path.join(projectRoot, 'model', 'estadisticas_por_ciudad.json'),
  path.join(projectRoot, 'modelos_predictivos', 'alquiler', 'data', 'estadisticas_por_ciudad.json')
]) || {};

// Cargar amenities conjunto (todas las amenidades posibles de todas las ciudades)
const amenitiesConjunto = readJsonPrefer([
  path.join(projectRoot, 'model', 'amenities_conjunto.json'),
  path.join(projectRoot, 'modelos_predictivos', 'alquiler', 'data', 'amenities_conjunto.json')
]) || {};

// Cargar estadísticas por barrio (mean, median, std de precio)
const estadisticasBarrio = readJsonPrefer([
  path.join(projectRoot, 'model', 'estadisticas_barrio.json'),
  path.join(projectRoot, 'modelos_predictivos', 'alquiler', 'data', 'estadisticas_barrio.json')
]) || {};

// Utilidades de normalización para localizar claves de ciudad/barrio
const normalizeStr = (str) => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function findCityKeyBarrio(data, cityRaw) {
  const norm = normalizeStr(cityRaw);
  const aliases = {
    'malaga': 'Malaga',
    'málaga': 'Malaga',
    'madrid': 'Madrid',
    'barcelona': 'Barcelona',
    'valencia': 'Valencia',
    'sevilla': 'Sevilla',
    'euskadi': 'Euskadi',
    'girona': 'Girona',
    'mallorca': 'Mallorca',
    'menorca': 'Menorca'
  };
  if (data[cityRaw]) return cityRaw;
  if (aliases[norm] && data[aliases[norm]]) return aliases[norm];
  return Object.keys(data).find(key => normalizeStr(key) === norm);
}

function findBarrioKeyBarrio(barrioObj, barrioRaw) {
  const norm = normalizeStr(barrioRaw);
  return Object.keys(barrioObj).find(key => normalizeStr(key) === norm);
}

// Cargar festivos 2025 (nacionales y por CCAA)
const fiestasES = readJsonPrefer([
  path.join(projectRoot, 'model', 'fiestas_es_2025.json'),
  path.join(projectRoot, 'modelos_predictivos', 'alquiler', 'data', 'fiestas_es_2025.json')
]) || {};

// Helper: mapa de ciudad -> comunidad autónoma (para festivos autonómicos)
const cityToCommunity = {
  'Barcelona': 'Cataluña',
  'Girona': 'Cataluña',
  'Madrid': 'Comunidad de Madrid',
  'Valencia': 'Comunitat Valenciana',
  'Málaga': 'Andalucía',
  'Malaga': 'Andalucía',
  'Sevilla': 'Andalucía',
  'Mallorca': 'Illes Balears',
  'Menorca': 'Illes Balears',
  'Bilbao': 'Euskadi',
  'Vitoria': 'Euskadi',
  'San Sebastián': 'Euskadi',
  'San Sebastian': 'Euskadi'
};

// Helper: comparar fecha en formato YYYY-MM-DD
function toYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseISO(str) {
  // Asumir 'YYYY-MM-DD'
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isBetween(target, start, end) {
  const t = target.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

// Devuelve una línea resumida del contexto de fecha: festivo/puente/temporada/evento
function computeFechaContext(origen, stay_date) {
  try {
    if (!stay_date || !fiestasES || !fiestasES.year) return null;
    const d = parseISO(stay_date);
    if (isNaN(d)) return null;

    const ymd = toYMD(d);
    const comunidad = cityToCommunity[origen] || null;

    // 1) Festivo nacional exacto
    const nat = (fiestasES.national || []).find(f => f.date === ymd);
    if (nat) return `Festivo nacional: ${nat.name}`;

    // 2) Festivo autonómico exacto
    if (comunidad && fiestasES.autonomous && fiestasES.autonomous[comunidad]) {
      const auto = fiestasES.autonomous[comunidad].find(f => f.date === ymd);
      if (auto) return `Festivo autonómico (${comunidad}): ${auto.name}`;
    }

    // 3) Puente (+/- 1 día respecto a algún festivo nacional o autonómico)
    const oneDayMs = 24 * 60 * 60 * 1000;
    const near = (list) => list.find(f => Math.abs(parseISO(f.date).getTime() - d.getTime()) === oneDayMs);
    const natNear = near(fiestasES.national || []);
    if (natNear) return `Puente por ${natNear.name}`;
    if (comunidad && fiestasES.autonomous && fiestasES.autonomous[comunidad]) {
      const autoNear = near(fiestasES.autonomous[comunidad]);
      if (autoNear) return `Puente autonómico (${comunidad}) por ${autoNear.name}`;
    }

    // 4) Eventos de ciudad
    const eventsByCity = fiestasES.seasons && fiestasES.seasons.city_events ? fiestasES.seasons.city_events : {};
    if (eventsByCity && eventsByCity[origen]) {
      const ev = eventsByCity[origen].find(e => isBetween(d, parseISO(e.start), parseISO(e.end)));
      if (ev) return `Evento en ciudad (${origen}): ${ev.name}`;
    }

    // 5) Temporadas globales
    const globalSeasons = fiestasES.seasons && fiestasES.seasons.global ? fiestasES.seasons.global : [];
    const season = globalSeasons.find(s => isBetween(d, parseISO(s.start), parseISO(s.end)));
    if (season) {
      const level = season.level === 'alta' ? 'Temporada alta' : (season.level === 'baja' ? 'Temporada baja' : 'Temporada');
      return `${level}: ${season.name}`;
    }

    return null;
  } catch (e) {
    console.warn('[WARN] computeFechaContext fallo:', e.message);
    return null;
  }
}

// Modelos de alquiler mapeados a nombres "camuflados" (rápido/detallado)
const RENTAL_MODEL_PATHS = {
  rapida: path.join(projectRoot, 'modelos_predictivos', 'alquiler', 'RF', 'model_rf_optimized.pkl'),
  detallada: path.join(projectRoot, 'modelos_predictivos', 'alquiler', 'GB', 'model_gb_optimized.pkl')
};

module.exports = {
  readJsonPrefer,
  options,
  stats,
  amenitiesConjunto,
  estadisticasBarrio,
  normalizeStr,
  findCityKeyBarrio,
  findBarrioKeyBarrio,
  fiestasES,
  cityToCommunity,
  toYMD,
  parseISO,
  isBetween,
  computeFechaContext,
  RENTAL_MODEL_PATHS,
  projectRoot
};
