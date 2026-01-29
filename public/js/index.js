// Mapeo ciudad -> comunidad autónoma para festivos regionales
const comunidadPorCiudad = {
    'Barcelona': 'Cataluña',
    'Girona': 'Cataluña',
    'Madrid': 'Comunidad de Madrid',
    'Malaga': 'Andalucía',
    'Sevilla': 'Andalucía',
    'Mallorca': 'Illes Balears',
    'Menorca': 'Illes Balears',
    'Valencia': 'Comunitat Valenciana',
    'Euskadi': 'Euskadi'
};

function actualizarBarrios() {
    const ciudadSelect = document.getElementById('origen');
    const barrioSelect = document.getElementById('barrio');
    const ciudad = ciudadSelect.value;

    // Limpiar opciones previas
    barrioSelect.innerHTML = '<option value="">Selecciona un barrio</option>';

    if (ciudad && barriosPorCiudad[ciudad]) {
        barriosPorCiudad[ciudad].forEach(function(barrio) {
            const option = document.createElement('option');
            option.value = barrio;
            option.textContent = barrio;
            barrioSelect.appendChild(option);
        });
    }

    // Actualizar selects según los límites de la ciudad
    actualizarSelectsPorCiudad(ciudad);
    
    // Render amenities (usamos el conjunto para todas las ciudades)
    actualizarAmenidades();
    
    // Limpiar estadísticas al cambiar ciudad
    limpiarEstadisticasBarrio();
}

function actualizarEstadisticasBarrio() {
    const ciudadSelect = document.getElementById('origen');
    const barrioSelect = document.getElementById('barrio');
    const ciudad = ciudadSelect.value;
    const barrio = barrioSelect.value;
    
    const meanInput = document.getElementById('barrio_mean_price');
    const medianInput = document.getElementById('barrio_median_price');
    const stdInput = document.getElementById('barrio_std_price');
    
    console.log('[DEBUG] Buscando estadísticas para:', ciudad, '-', barrio);
    
    let stats = null;
    
    // Intentar búsqueda exacta
    if (ciudad && barrio && estadisticasBarrio[ciudad] && estadisticasBarrio[ciudad][barrio]) {
        stats = estadisticasBarrio[ciudad][barrio];
        console.log('[DEBUG] Encontrado con nombre exacto:', barrio);
    } 
    // Intentar sin guiones ni espacios (normalizado)
    else if (ciudad && barrio && estadisticasBarrio[ciudad]) {
        // Buscar variaciones: "Moncloa-aravaca" -> buscar "Aravaca", "Moncloa", "Moncloa-Aravaca"
        const barrioNormalizado = barrio.toLowerCase().replace(/[-\s]/g, '');
        
        for (const [key, value] of Object.entries(estadisticasBarrio[ciudad])) {
            const keyNormalizado = key.toLowerCase().replace(/[-\s]/g, '');
            if (keyNormalizado === barrioNormalizado || 
                barrioNormalizado.includes(keyNormalizado) ||
                keyNormalizado.includes(barrioNormalizado)) {
                stats = value;
                console.log('[DEBUG] Encontrado con variación:', key, '(buscando:', barrio + ')');
                break;
            }
        }
    }
    
    if (stats) {
        console.log('[DEBUG] Estadísticas encontradas:', stats);
        meanInput.value = stats.mean_price || 160;
        medianInput.value = stats.median_price || 150;
        stdInput.value = Math.round(stats.mean_price * 0.2) || 35;
    } else {
        console.log('[DEBUG] No se encontraron estadísticas para', barrio, '- usando valores por defecto');
        meanInput.value = 160;
        medianInput.value = 150;
        stdInput.value = 35;
    }
}

function limpiarEstadisticasBarrio() {
    const meanInput = document.getElementById('barrio_mean_price');
    const medianInput = document.getElementById('barrio_median_price');
    const stdInput = document.getElementById('barrio_std_price');
    
    if (meanInput) meanInput.value = 160;
    if (medianInput) medianInput.value = 150;
    if (stdInput) stdInput.value = 35;
}

// -------- Festivos y puentes --------
function parseISO(d) { return new Date(d + 'T00:00:00'); }

function sameDate(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function inRange(date, startStr, endStr) {
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    return date >= start && date <= end;
}

function getHolidaysFor(ciudad) {
    const lista = [];
    if (fiestasES.national) lista.push(...fiestasES.national);
    const comunidad = comunidadPorCiudad[ciudad] || null;
    if (comunidad && fiestasES.autonomous && fiestasES.autonomous[comunidad]) {
        lista.push(...fiestasES.autonomous[comunidad]);
    }
    return lista;
}

function checkHoliday() {
    const ciudad = document.getElementById('origen')?.value;
    const fechaStr = document.getElementById('stay_date')?.value;
    const alertBox = document.getElementById('holidayAlert');
    const alertText = document.getElementById('holidayAlertText');

    if (!ciudad || !fechaStr) { if (alertBox) alertBox.classList.add('d-none'); return; }

    const fecha = new Date(fechaStr + 'T00:00:00');
    const holidays = getHolidaysFor(ciudad);
    const seasons = (fiestasES.seasons && fiestasES.seasons.global) ? fiestasES.seasons.global : [];
    const cityEvents = (fiestasES.seasons && fiestasES.seasons.city_events && fiestasES.seasons.city_events[ciudad]) ? fiestasES.seasons.city_events[ciudad] : [];

    // Buscar festivo exacto
    let found = null;
    for (const h of holidays) {
        const hd = parseISO(h.date);
        if (sameDate(hd, fecha)) { found = { ...h, type: 'festivo' }; break; }
    }

    // Heurística de puente: lunes con festivo el martes, viernes con festivo el jueves
    if (!found) {
        const dow = fecha.getDay(); // 0=Dom, 1=Lun, ... 6=Sab
        const plus1 = new Date(fecha); plus1.setDate(plus1.getDate() + 1);
        const minus1 = new Date(fecha); minus1.setDate(minus1.getDate() - 1);

        const hayFestivoPlus1 = holidays.some(h => sameDate(parseISO(h.date), plus1));
        const hayFestivoMinus1 = holidays.some(h => sameDate(parseISO(h.date), minus1));

        if ((dow === 1 && hayFestivoPlus1) || (dow === 5 && hayFestivoMinus1)) {
            // Puente típico
            const h = holidays.find(x => sameDate(parseISO(x.date), dow === 1 ? plus1 : minus1));
            found = { ...h, type: 'puente' };
        }
    }

    // Detectar temporadas
    const seasonHits = [];
    for (const s of seasons) {
        if (inRange(fecha, s.start, s.end)) seasonHits.push({ ...s, scope: 'global' });
    }
    for (const ce of cityEvents) {
        if (inRange(fecha, ce.start, ce.end)) seasonHits.push({ ...ce, scope: 'city' });
    }

    if (alertBox) {
        const parts = [];
        if (found) {
            parts.push(found.type === 'festivo' 
                ? `Fecha coincidente con festivo: "${found.name}".`
                : `Fin de semana de puente por "${found.name}".`);
        }
        if (seasonHits.length > 0) {
            const textos = seasonHits.map(s => {
                const tipo = s.level === 'alta' ? 'Temporada alta' : (s.level === 'baja' ? 'Temporada baja' : 'Temporada');
                return `${tipo}: ${s.name}`;
            });
            parts.push(textos.join(' · '));
        }

        if (parts.length > 0) {
            alertText.textContent = parts.join('  ');
            alertBox.classList.remove('d-none');
        } else {
            alertBox.classList.add('d-none');
        }
    }
}

function actualizarSelectsPorCiudad(ciudad) {
    if (!ciudad || !statsByCity[ciudad]) return;

    const stats = statsByCity[ciudad];
    
    // Actualizar bedrooms (valores enteros)
    const bedroomsSelect = document.getElementById('bedrooms');
    bedroomsSelect.innerHTML = '<option value="">Selecciona</option>';
    const minBed = Math.ceil(stats.bedrooms?.min || 0);
    const maxBed = Math.floor(stats.bedrooms?.max || 10);
    for (let i = minBed; i <= maxBed; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        bedroomsSelect.appendChild(option);
    }
    
    // Actualizar bathrooms (valores con decimales 0.5)
    const bathroomsSelect = document.getElementById('bathrooms');
    bathroomsSelect.innerHTML = '<option value="">Selecciona</option>';
    const minBath = stats.bathrooms?.min || 0;
    const maxBath = stats.bathrooms?.max || 10;
    for (let i = minBath; i <= maxBath; i += 0.5) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        bathroomsSelect.appendChild(option);
    }
    
    // Actualizar accommodates (valores enteros)
    const accommodatesSelect = document.getElementById('accommodates');
    accommodatesSelect.innerHTML = '<option value="">Selecciona</option>';
    const minAcc = Math.ceil(stats.accommodates?.min || 1);
    const maxAcc = Math.floor(stats.accommodates?.max || 16);
    for (let i = minAcc; i <= maxAcc; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        accommodatesSelect.appendChild(option);
    }
}

// Render amenities sin títulos ni grupos, solo lista simple
function actualizarAmenidades() {
    const container = document.getElementById('amenitiesContainer');
    container.innerHTML = '';

    const allAmenities = amenitiesConjunto.amenities || [];
    const PREVIEW_COUNT = 6;

    allAmenities.forEach((amenity, idx) => {
        const col = document.createElement('div');
        col.className = 'col-md-4 col-sm-6';
        col.setAttribute('data-item-index', idx);
        if (idx >= PREVIEW_COUNT) {
            col.classList.add('d-none');
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'form-check';

        const input = document.createElement('input');
        input.className = 'form-check-input';
        input.type = 'checkbox';
        input.name = 'amenities';
        input.value = amenity;
        input.id = 'amen_' + idx;

        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.htmlFor = 'amen_' + idx;
        label.textContent = amenity;

        wrapper.appendChild(input);
        wrapper.appendChild(label);
        col.appendChild(wrapper);
        container.appendChild(col);
    });
}

// Botón para expandir/colapsar amenities
function toggleAllAmenities() {
    console.log('Toggle clicked');
    const container = document.getElementById('amenitiesContainer');
    const toggleBtn = document.getElementById('toggleAllAmenities');
    
    if (!container || !toggleBtn) {
        console.log('Container or button not found');
        return;
    }
    
    const allItems = container.querySelectorAll('[data-item-index]');
    console.log('Total items:', allItems.length);
    
    // Verificar el estado actual (mirando el primer item >= 6)
    let isCollapsed = false;
    allItems.forEach((item, idx) => {
        const itemIdx = parseInt(item.getAttribute('data-item-index'));
        if (itemIdx >= 6 && item.classList.contains('d-none')) {
            isCollapsed = true;
        }
    });
    
    console.log('Is collapsed:', isCollapsed);
    
    // Toggle todos los items >= 6
    allItems.forEach((item) => {
        const itemIdx = parseInt(item.getAttribute('data-item-index'));
        if (itemIdx >= 6) {
            if (isCollapsed) {
                item.classList.remove('d-none');
            } else {
                item.classList.add('d-none');
            }
        }
    });
    
    toggleBtn.textContent = isCollapsed ? 'Ver menos' : 'Ver más';
    console.log('New button text:', toggleBtn.textContent);
}

// Validación del formulario
document.addEventListener('DOMContentLoaded', function() {
    const forms = document.querySelectorAll('.needs-validation');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const submitBtn = document.getElementById('submitBtn');
    
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            } else {
                // Mostrar spinner si el formulario es válido
                if (loadingSpinner) {
                    loadingSpinner.classList.remove('d-none');
                }
                if (submitBtn) {
                    submitBtn.disabled = true;
                }
            }
            form.classList.add('was-validated');
        }, false);
    });

    // Cargar amenidades al inicio (conjunto disponible para todas las ciudades)
    actualizarAmenidades();
    
    // Agregar event listener al botón Ver más
    const toggleBtn = document.getElementById('toggleAllAmenities');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleAllAmenities);
    }
    
    // Agregar event listener al selector de barrio para actualizar estadísticas
    const barrioSelect = document.getElementById('barrio');
    if (barrioSelect) {
        barrioSelect.addEventListener('change', actualizarEstadisticasBarrio);
    }

    // Listener para detectar festivos/puentes
    const stayDate = document.getElementById('stay_date');
    const ciudadSelect = document.getElementById('origen');
    if (stayDate) stayDate.addEventListener('change', checkHoliday);
    if (ciudadSelect) ciudadSelect.addEventListener('change', checkHoliday);
    
    // Si ya hay ciudad seleccionada (por reload) renderizamos barrios
    const origen = document.getElementById('origen');
    if (origen && origen.value) actualizarBarrios();
    // Chequear festivo si ya hay fecha
    checkHoliday();
});
