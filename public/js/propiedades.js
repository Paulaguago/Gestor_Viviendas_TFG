// ========================================
// GESTIÓN DE PROPIEDADES - DASHBOARD
// ========================================

// Variable global para almacenar el ID de la vivienda a eliminar
let viviendaIdEliminar = null;

// Auto-ocultar alertas después de 3 segundos
document.addEventListener('DOMContentLoaded', () => {
    const alertMessage = document.getElementById('alertMessage');
    if (alertMessage) {
        setTimeout(() => {
            alertMessage.style.animation = 'slideOutUp 0.3s ease-out';
            setTimeout(() => {
                alertMessage.style.display = 'none';
            }, 300);
        }, 3000);
    }

    // ========================================
    // FILTROS Y BÚSQUEDA
    // ========================================
    const filterPills = document.querySelectorAll('.filter-pill');
    const propertyCards = document.querySelectorAll('.property-card');
    const propertiesGrid = document.getElementById('propiedadesGrid');
    const noResultsMsg = document.getElementById('noResultsMessage');

    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('filter-pill--active'));
            pill.classList.add('filter-pill--active');

            const filter = pill.dataset.filter;
            let visibleCount = 0;

            propertyCards.forEach(card => {
                const estado = card.dataset.estado;
                const shouldShow = (filter === 'todas' || estado === filter);
                card.style.display = shouldShow ? 'flex' : 'none';
                if (shouldShow) visibleCount++;
            });

            toggleNoResults(visibleCount);
        });
    });

    // Buscador
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            let visibleCount = 0;

            propertyCards.forEach(card => {
                const text = card.textContent.toLowerCase();
                const shouldShow = text.includes(searchTerm);
                card.style.display = shouldShow ? 'flex' : 'none';
                if (shouldShow) visibleCount++;
            });

            toggleNoResults(visibleCount);
        });
    }

    function toggleNoResults(count) {
        if (count === 0 && propertyCards.length > 0) {
            propertiesGrid.style.display = 'none';
            noResultsMsg.style.display = 'block';
        } else {
            propertiesGrid.style.display = 'flex';
            noResultsMsg.style.display = 'none';
        }
    }

    // Cerrar modal con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarModalNuevaPropiedad();
    });

    // Event listener delegado para los inputs de archivo
    document.addEventListener('change', function(e) {
        if (e.target && e.target.type === 'file' && e.target.id.startsWith('file-')) {
            e.preventDefault();
            e.stopPropagation();
            const viviendaId = e.target.id.replace('file-', '');
            subirImagenVivienda(viviendaId, e.target);
        }
    });
});

// ========================================
// STEPPER WIZARD - MODAL NUEVA PROPIEDAD
// ========================================
let currentStep = 1;
const totalSteps = 4;

const stepInfo = {
    1: { title: 'Información Básica de la Propiedad', subtitle: 'Complete los datos principales de su propiedad' },
    2: { title: 'Ubicación y Dirección', subtitle: 'Proporcione la Ubicación exacta de la propiedad' },
    3: { title: 'Marketing y Precios', subtitle: 'Configure precios, descripción y visibilidad' },
    4: { title: 'Documentación Legal', subtitle: 'Información registral y catastral de la propiedad' }
};

function abrirModalNuevaPropiedad() {
    const modal = document.getElementById('modalNuevaPropiedad');
    if (modal) {
        modal.classList.add('modal-overlay--active');
        currentStep = 1;
        showStep(1);
        setTimeout(() => { 
            if (!window.leafletMap) inicializarMapa(); 
            inicializarAutocompletadoDireccion();
        }, 100);
    }
}

function cerrarModalNuevaPropiedad() {
    const modal = document.getElementById('modalNuevaPropiedad');
    if (modal) {
        modal.classList.remove('modal-overlay--active');
        resetForm();
    }
}

function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < totalSteps) {
            showStep(currentStep + 1);
        }
    }
}

function previousStep() {
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
}

function resetForm() {
    document.getElementById('formNuevaPropiedad').reset();
    currentStep = 1;
    showStep(1);
    selectedAmenities = [];
    document.getElementById('selectedAmenitiesDisplay').innerHTML = '<span class=\"text-sm text-gray-500\">No se han seleccionado comodidades</span>';
    document.getElementById('hiddenAmenitiesInputs').innerHTML = '';
}
// ========================================
// FUNCIONES DEL STEPPER WIZARD
// ========================================

function showStep(stepNumber) {
    // Ocultar todos los pasos
    for (let i = 1; i <= totalSteps; i++) {
        const step = document.getElementById(`step-${i}`);
        if (step) {
            if (i === stepNumber) {
                step.classList.remove('hidden');
                step.style.display = 'flex';
            } else {
                step.classList.add('hidden');
                step.style.display = 'none';
            }
        }
    }

    // ========== ACTUALIZAR BARRA DE PROGRESO SUPERIOR ==========
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar) {
        const percentages = { 1: '25%', 2: '50%', 3: '75%', 4: '100%' };
        progressBar.style.width = percentages[stepNumber];
    }
    
    if (progressText) {
        progressText.textContent = `Paso ${stepNumber}/4`;
    }

    // ========== ACTUALIZAR LÍNEA DE PROGRESO SIDEBAR ==========
    const progressLine = document.getElementById('progressLine');
    if (progressLine) {
        // Altura de cada paso: ~3.125rem (2.25rem círculo + 0.875rem gap)
        const heights = { 1: '0', 2: '3.125rem', 3: '6.25rem', 4: '9.375rem' };
        progressLine.style.height = heights[stepNumber];
    }

    // ========== ACTUALIZAR NAVEGACIÓN LATERAL (Desktop) ==========
    document.querySelectorAll('.step-nav').forEach(nav => {
        const navStep = parseInt(nav.dataset.step);
        const circle = nav.querySelector('.step-circle');
        const icons = nav.querySelectorAll('i');
        const title = nav.querySelector('.step-title');
        const subtitle = title?.nextElementSibling;
        
        if (navStep === stepNumber) {
            // PASO ACTIVO - círculo blanco con ícono azul
            circle.style.background = 'white';
            circle.style.color = '#000080';
            circle.style.border = 'none';
            
            title.style.color = 'white';
            title.style.fontWeight = '700';
            if (subtitle) subtitle.style.color = 'rgba(255,255,255,0.7)';
            
            icons[0].style.display = 'block';
            icons[1].style.display = 'none';
            
            nav.style.opacity = '1';
            nav.removeAttribute('disabled');
            
        } else if (navStep < stepNumber) {
            // PASO COMPLETADO - círculo blanco con check azul
            circle.style.background = 'white';
            circle.style.color = '#000080';
            circle.style.border = 'none';
            
            title.style.color = 'rgba(255,255,255,0.9)';
            title.style.fontWeight = '600';
            if (subtitle) subtitle.style.color = 'rgba(255,255,255,0.5)';
            
            icons[0].style.display = 'none';
            icons[1].style.display = 'block'; // Mostrar check
            
            nav.style.opacity = '1';
            nav.removeAttribute('disabled');
            
        } else {
            // PASO PENDIENTE - círculo gris transparente
            circle.style.background = 'rgba(255,255,255,0.2)';
            circle.style.color = 'rgba(255,255,255,0.6)';
            circle.style.border = 'none';
            
            title.style.color = 'rgba(255,255,255,0.6)';
            title.style.fontWeight = '600';
            if (subtitle) subtitle.style.color = 'rgba(255,255,255,0.4)';
            
            icons[0].style.display = 'block';
            icons[1].style.display = 'none';
            
            nav.style.opacity = '0.5';
            nav.setAttribute('disabled', 'true');
        }
    });

    // ========== ACTUALIZAR NAVEGACIÓN MÓVIL ==========
    document.querySelectorAll('.step-nav-mobile').forEach(nav => {
        const navStep = parseInt(nav.dataset.step);
        const circle = nav.querySelector('.step-circle-mobile');
        const icons = nav.querySelectorAll('i');
        const label = nav.querySelector('span');
        
        if (navStep === stepNumber) {
            // PASO ACTIVO - círculo blanco con ícono azul
            circle.style.background = 'white';
            circle.style.color = '#000080';
            circle.style.border = 'none';
            
            if (label) label.style.color = 'white';
            
            icons[0].style.display = 'block';
            icons[1].style.display = 'none';
            
            nav.style.opacity = '1';
            nav.removeAttribute('disabled');
            
        } else if (navStep < stepNumber) {
            // PASO COMPLETADO - círculo blanco con check verde
            circle.style.background = 'white';
            circle.style.color = '#10b981';
            circle.style.border = 'none';
            
            if (label) label.style.color = 'rgba(255,255,255,0.8)';
            
            icons[0].style.display = 'none';
            icons[1].style.display = 'block'; // Mostrar check
            
            nav.style.opacity = '1';
            nav.removeAttribute('disabled');
            
        } else {
            // PASO PENDIENTE - círculo gris transparente
            circle.style.background = 'rgba(255,255,255,0.2)';
            circle.style.color = 'rgba(255,255,255,0.6)';
            circle.style.border = '0.0625rem solid rgba(255,255,255,0.3)';
            
            if (label) label.style.color = 'rgba(255,255,255,0.5)';
            
            icons[0].style.display = 'block';
            icons[1].style.display = 'none';
            
            nav.style.opacity = '0.4';
            nav.setAttribute('disabled', 'true');
        }
    });

    // Actualizar título
    const info = stepInfo[stepNumber];
    document.getElementById('stepTitle').textContent = info.title;
    document.getElementById('stepSubtitle').textContent = info.subtitle;

    // Actualizar botones
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnSave = document.getElementById('btnSave');

    if (stepNumber === 1) {
        btnPrev.classList.add('hidden');
    } else {
        btnPrev.classList.remove('hidden');
    }

    if (stepNumber === totalSteps) {
        btnNext.classList.add('hidden');
        btnSave.classList.remove('hidden');
    } else {
        btnNext.classList.remove('hidden');
        btnSave.classList.add('hidden');
    }

    // Invalidar mapa en paso 2
    if (stepNumber === 2 && window.leafletMap) {
        setTimeout(() => { window.leafletMap.invalidateSize(); }, 100);
    }

    currentStep = stepNumber;
}

function goToStep(stepNumber) {
    const navButton = document.querySelector(`.step-nav[data-step="${stepNumber}"]`);
    if (navButton && navButton.hasAttribute('disabled')) {
        return;
    }

    if (stepNumber < currentStep) {
        showStep(stepNumber);
        return;
    }

    let isValid = true;
    for (let i = currentStep; i < stepNumber; i++) {
        if (!validateStep(i)) {
            isValid = false;
            showModernAlert(`Por favor, completa todos los campos obligatorios del paso ${i} antes de continuar.`, 'warning');
            break;
        }
    }

    if (isValid) {
        showStep(stepNumber);
    }
}

function validateCurrentStep() {
    return validateStep(currentStep);
}

function validateStep(stepNumber) {
    const step = document.getElementById(`step-${stepNumber}`);
    if (!step) return true;

    const requiredInputs = step.querySelectorAll('input[required], select[required], textarea[required]');
    let isValid = true;

    requiredInputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            // Borde rojo para campos vacíos
            input.style.borderColor = '#ef4444';
            input.style.boxShadow = '0 0 0 0.1875rem rgba(239, 68, 68, 0.1)';
            
            input.addEventListener('input', function() {
                // Volver a azul cuando el usuario empiece a escribir
                this.style.borderColor = '#000080';
                this.style.boxShadow = '0 0 0 0.1875rem rgba(0, 0, 128, 0.1)';
            }, { once: true });
        }
    });

    if (!isValid) {
        showModernAlert('Por favor, completa todos los campos obligatorios (*) antes de continuar.', 'warning');
    }

    return isValid;
}

// ========================================
// AUTOCOMPLETAR Dirección
// ========================================

function inicializarAutocompletadoDireccion() {
    const campos = ['calle', 'bloque_portal', 'escalera', 'piso', 'letra_numero'];
    campos.forEach(campo => {
        const input = document.querySelector(`input[name="${campo}"]`);
        if (input) {
            input.removeEventListener('input', generarDireccionCompleta);
            input.addEventListener('input', generarDireccionCompleta);
        }
    });
}

function generarDireccionCompleta() {
    const calle = document.querySelector('input[name="calle"]')?.value || '';
    const bloque = document.querySelector('input[name="bloque_portal"]')?.value || '';
    const escalera = document.querySelector('input[name="escalera"]')?.value || '';
    const piso = document.querySelector('input[name="piso"]')?.value || '';
    const letra = document.querySelector('input[name="letra_numero"]')?.value || '';

    const partes = [calle];
    if (bloque) partes.push(bloque);
    if (escalera) partes.push(escalera);
    if (piso) partes.push(piso);
    if (letra) partes.push(letra);

    const direccionCompleta = partes.filter(p => p.trim()).join(', ');
    document.querySelector('input[name="direccion"]').value = direccionCompleta;
}

// ========================================
// LEAFLET - MAPA
// ========================================

let currentMarker = null;

function inicializarMapa() {
    if (window.leafletMap) return;
    window.leafletMap = L.map('mapa-nuevo').setView([40.4168, -3.7038], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(window.leafletMap);

    window.leafletMap.on('click', function(e) {
        colocarMarcador(e.latlng.lat, e.latlng.lng);
    });
}

function colocarMarcador(lat, lng) {
    if (currentMarker) window.leafletMap.removeLayer(currentMarker);
    currentMarker = L.marker([lat, lng]).addTo(window.leafletMap);
    document.getElementById('latitudInput').value = lat.toFixed(6);
    document.getElementById('longitudInput').value = lng.toFixed(6);
}

async function buscarUbicacion() {
    const direccion = document.getElementById('buscarDireccion').value;
    if (!direccion) return;

    showSpinner('Buscando ubicación...', 'Consultando mapa', 'fa-map-marker-alt');

    try {
        const response = await fetch(`/api/geocoding?q=${encodeURIComponent(direccion)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            window.leafletMap.setView([lat, lng], 15);
            colocarMarcador(lat, lng);
            hideSpinner();
            showModernAlert('¡Ubicación encontrada!', 'success');
        } else {
            hideSpinner();
            showModernAlert('No se encontró la Dirección', 'warning');
        }
    } catch (error) {
        console.error('Error:', error);
        hideSpinner();
        showModernAlert('Error al buscar la Ubicación. Intenta colocar el marcador manualmente.', 'error');
    }
}

// ========================================
// SUBMIT NUEVA PROPIEDAD
// ========================================

async function submitNuevaPropiedad() {
    const form = document.getElementById('formNuevaPropiedad');
    const formData = new FormData(form);

    console.log('Enviando formulario...');
    // Mostrar los datos que se están enviando para debugging
    for (let [key, value] of formData.entries()) {
        console.log(key, ':', value);
    }

    // Mostrar spinner
    showSpinner('Creando propiedad...', 'Guardando la información', 'fa-home');

    try {
        const response = await fetch('/propiedades/', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        console.log('Respuesta del servidor:', data);

        if (response.ok && data.success) {
            // Mantener el spinner con "Creando propiedad..." hasta redirigir
            showModernAlert('Propiedad creada exitosamente', 'success');
            setTimeout(() => window.location.href = '/propiedades', 1000);
        } else {
            hideSpinner();
            const errorMsg = data.error || 'Error al crear la propiedad';
            showModernAlert(errorMsg, 'error');
            console.error('Error del servidor:', data);
        }
    } catch (error) {
        hideSpinner();
        console.error('Error en la solicitud:', error);
        showModernAlert('Error al enviar el formulario. Revisa la consola para más detalles.', 'error');
    }
}

// ========================================
// ELIMINAR PROPIEDAD
// ========================================

function eliminarVivienda(id) {
    viviendaIdEliminar = id;
    document.getElementById('modalConfirmarEliminar').classList.add('modal-overlay--active');
}

function cerrarModalEliminar() {
    document.getElementById('modalConfirmarEliminar').classList.remove('modal-overlay--active');
    viviendaIdEliminar = null;
}

async function confirmarEliminarVivienda() {
    if (!viviendaIdEliminar) return;

    // Guardar el ID antes de cerrar el modal (cerrarModalEliminar lo pone a null)
    const idToDelete = viviendaIdEliminar;

    // Cerrar modal y mostrar spinner
    cerrarModalEliminar();
    showSpinner('Eliminando propiedad...', 'Esta acción no se puede deshacer', 'fa-trash-alt');

    try {
        const response = await fetch(`/propiedades/${idToDelete}`, { 
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (response.ok && data.success) {
            setTimeout(() => {
                window.location.href = '/propiedades?mensaje=eliminada';
            }, 800);
        } else {
            hideSpinner();
            showModernAlert(data.error || 'Error al eliminar la propiedad', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        hideSpinner();
        showModernAlert('Error de conexión al eliminar la propiedad', 'error');
    }
}

// ========================================
// SUBIR IMAGEN
// ========================================

async function subirImagenVivienda(viviendaId, fileInput) {
    const file = fileInput.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        showModernAlert('Por favor selecciona un archivo de imagen válido', 'warning');
        fileInput.value = '';
        return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showModernAlert('La imagen no debe superar los 5MB', 'warning');
        fileInput.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('imagen', file);

    // Obtener elementos — soporta tanto el nuevo diseño (.mp-card) como el legacy (.property-card)
    const propertyCard = fileInput.closest('.mp-card') || fileInput.closest('.property-card');
    const imageContainer = propertyCard
        ? (propertyCard.querySelector('.mp-img-wrap') || propertyCard.querySelector('.property-image'))
        : null;
    
    // Agregar transición suave - fade out
    if (imageContainer) {
        imageContainer.style.transition = 'opacity 0.3s ease';
        imageContainer.style.opacity = '0.4';
    }

    try {
        const response = await fetch(`/propiedades/${viviendaId}/imagen`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            
            if (imageContainer && data.imagen_url) {
                // Actualizar solo el src de la imagen o crear nueva imagen
                let imgElement = imageContainer.querySelector('img');
                if (imgElement) {
                    // Fade out completo antes de cambiar
                    imageContainer.style.opacity = '0';
                    
                    setTimeout(() => {
                        // Cambiar la imagen
                        imgElement.src = data.imagen_url + '?t=' + new Date().getTime();
                        
                        // Fade in suave
                        setTimeout(() => {
                            imageContainer.style.opacity = '1';
                        }, 50);
                    }, 300);
                } else {
                    // Si no hay imagen, crear una nueva (nuevo diseño: .mp-img-placeholder, legacy: .image-placeholder)
                    const placeholder = imageContainer.querySelector('.mp-img-placeholder') || imageContainer.querySelector('.image-placeholder');
                    if (placeholder) {
                        imageContainer.style.opacity = '0';
                        
                        setTimeout(() => {
                            const newImg = document.createElement('img');
                            newImg.src = data.imagen_url + '?t=' + new Date().getTime();
                            newImg.alt = 'Imagen de propiedad';
                            newImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
                            placeholder.replaceWith(newImg);
                            
                            setTimeout(() => {
                                imageContainer.style.opacity = '1';
                            }, 50);
                        }, 300);
                    }
                }
                
                // Limpiar el input file para permitir subir la misma imagen de nuevo
                fileInput.value = '';
                
                showModernAlert('Imagen subida exitosamente', 'success');
            }
        } else {
            // Restaurar opacidad en caso de error
            if (imageContainer) {
                imageContainer.style.opacity = '1';
            }
            showModernAlert('Error al subir la imagen', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        // Restaurar opacidad en caso de error
        if (imageContainer) {
            imageContainer.style.opacity = '1';
        }
        showModernAlert('Error al subir la imagen', 'error');
    }
}

// ========================================
// MODAL DE COMODIDADES
// ========================================

let selectedAmenities = [];
let amenitiesData = null;
let customAmenities = [];

const amenityIcons = {
    'WiFi': 'fas fa-wifi',
    'Aire acondicionado': 'fas fa-snowflake',
    'Calefacción': 'fas fa-thermometer-half',
    'Smart TV': 'fas fa-tv',
    'Lavadora': 'fas fa-tshirt',
    'Secadora': 'fas fa-wind',
    'Cocina': 'fas fa-utensils',
    'Microondas': 'fas fa-fire',
    'Nevera': 'fas fa-snowflake',
    'Cafetera': 'fas fa-coffee',
    'Horno': 'fas fa-fire',
    'Lavavajillas': 'fas fa-utensils',
    'Piscina': 'fas fa-swimming-pool',
    'Parking privado': 'fas fa-car',
    'Gimnasio': 'fas fa-dumbbell',
    'Jardín privado': 'fas fa-leaf',
    'Terraza': 'fas fa-tree',
    'Jacuzzi': 'fas fa-hot-tub',
    'Barbacoa': 'fas fa-fire',
    'Se admiten mascotas': 'fas fa-paw',
    'Cámara de seguridad': 'fas fa-video',
    'Alarma': 'fas fa-bell',
    'Caja fuerte': 'fas fa-lock',
    'Ascensor': 'fas fa-elevator',
    'Entrada privada': 'fas fa-key',
    'Check-in automático': 'fas fa-mobile',
    'Portero automático': 'fas fa-phone',
    'Recepción 24h': 'fas fa-clock',
    'Servicio de limpieza': 'fas fa-broom',
    'Plancha': 'fas fa-tshirt',
    'Secador de pelo': 'fas fa-wind',
    'Toallas': 'fas fa-bath',
    'Sábanas': 'fas fa-bed',
    'Champú': 'fas fa-pump-soap',
    'Gel de ducha': 'fas fa-shower',
    'Sistema de sonido': 'fas fa-music',
    'Consola de videojuegos': 'fas fa-gamepad',
    'Biblioteca': 'fas fa-book',
    'Sauna': 'fas fa-hot-tub',
    'Vista a la montaña': 'fas fa-mountain',
    'Chimenea': 'fas fa-fire',
    'Zona de juegos infantiles': 'fas fa-child'
};

async function cargarComodidades() {
    try {
        const response = await fetch('/modelos_predictivos/alquiler/data/amenities_conjunto.json');
        amenitiesData = await response.json();
        renderizarComodidades();
    } catch (error) {
        console.error('Error cargando comodidades:', error);
        amenitiesData = {
            amenities_grouped: {
                'Conectividad': ['WiFi'],
                'Climatización': ['Aire acondicionado', 'Calefacción'],
                'Cocina': ['Cocina', 'Microondas', 'Nevera'],
                'Exterior': ['Piscina', 'Parking privado', 'Jardín privado'],
                'Seguridad': ['Caja fuerte', 'Sistema de alarma']
            }
        };
        renderizarComodidades();
    }
}

function renderizarComodidades() {
    const grid = document.getElementById('amenitiesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const categoryCounts = { todos: 0, basicos: 0, cocina: 0, exterior: 0, seguridad: 0 };
    const categoryMapping = {
        'conectividad': 'basicos', 'climatizacion': 'basicos', 'Climatización': 'basicos',
        'básicos': 'basicos', 'basicos': 'basicos', 'lavanderia': 'basicos', 'acceso': 'basicos',
        'confortinterior': 'basicos', 'confort interior': 'basicos', 'cocina': 'cocina',
        'cocinacomedor': 'cocina', 'cocina y comedor': 'cocina', 'exterior': 'exterior',
        'piscinayspa': 'exterior', 'piscina y spa': 'exterior', 'Jardín': 'exterior',
        'jardin': 'exterior', 'parking': 'exterior', 'vistasyubicacion': 'exterior',
        'vistas y ubicacion': 'exterior', 'seguridad': 'seguridad', 'seguridadyprivacidad': 'seguridad',
        'seguridad y privacidad': 'seguridad', 'higiene': 'basicos', 'entretenimiento': 'basicos',
        'bienestar': 'exterior', 'servicios': 'basicos', 'extras': 'basicos'
    };

    if (!amenitiesData || !amenitiesData.amenities_grouped) return;

    Object.keys(amenitiesData.amenities_grouped).forEach(categoria => {
        amenitiesData.amenities_grouped[categoria].forEach(amenity => {
            const icon = amenityIcons[amenity] || 'fas fa-star';
            const categoryKey = categoria.toLowerCase().replace(/\s+/g, '');
            let mappedCategory = categoryMapping[categoryKey] || categoryKey;
            
            const item = document.createElement('label');
            item.className = 'amenity-item-modern';
            item.setAttribute('data-category', mappedCategory);
            item.setAttribute('data-name', amenity.toLowerCase());
            
            item.innerHTML = `
                <input type="checkbox" name="amenity[]" value="${amenity}">
                <div class="amenity-icon-modern">
                    <i class="${icon}"></i>
                </div>
                <div class="amenity-name-modern">${amenity}</div>
            `;
            
            categoryCounts.todos++;
            if (categoryCounts.hasOwnProperty(mappedCategory)) {
                categoryCounts[mappedCategory]++;
            }
            
            grid.appendChild(item);
        });
    });

    Object.keys(categoryCounts).forEach(category => {
        const button = document.querySelector(`button[data-category="${category}"]`);
        if (button) {
            const badge = button.querySelector('.badge');
            if (badge) badge.textContent = categoryCounts[category];
        }
    });

    const items = grid.querySelectorAll('.amenity-item-modern');
    items.forEach(item => {
        item.addEventListener('click', function() {
            const checkbox = this.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            
            if (checkbox.checked) {
                this.classList.add('selected');
                if (!selectedAmenities.includes(checkbox.value)) {
                    selectedAmenities.push(checkbox.value);
                }
            } else {
                this.classList.remove('selected');
                selectedAmenities = selectedAmenities.filter(a => a !== checkbox.value);
            }
            
            updateSelectedCount();
        });
    });
}

function añadirComodidadPersonalizada() {
    const input = document.getElementById('customAmenityInput');
    const valor = input.value.trim();
    
    if (!valor) {
        showModernAlert('Por favor, escribe una amenidad', 'warning');
        return;
    }

    if (customAmenities.includes(valor) || 
        (amenitiesData && amenitiesData.amenities && amenitiesData.amenities.includes(valor))) {
        showModernAlert('Esta amenidad ya existe', 'error');
        return;
    }

    customAmenities.push(valor);
    
    const grid = document.getElementById('amenitiesGrid');
    const item = document.createElement('label');
    item.className = 'amenity-item-modern selected';
    item.setAttribute('data-category', 'personalizada');
    item.setAttribute('data-name', valor.toLowerCase());
    
    item.innerHTML = `
        <input type="checkbox" name="amenity[]" value="${valor}" checked>
        <div class="amenity-icon-modern">
            <i class="fas fa-plus-circle" style="color: #f59e0b;"></i>
        </div>
        <div class="amenity-name-modern">${valor}</div>
    `;
    
    item.addEventListener('click', function() {
        const checkbox = this.querySelector('input[type="checkbox"]');
        checkbox.checked = !checkbox.checked;
        
        if (checkbox.checked) {
            this.classList.add('selected');
            if (!selectedAmenities.includes(checkbox.value)) {
                selectedAmenities.push(checkbox.value);
            }
        } else {
            this.classList.remove('selected');
            selectedAmenities = selectedAmenities.filter(a => a !== checkbox.value);
            customAmenities = customAmenities.filter(a => a !== checkbox.value);
            updateCustomAmenitiesDisplay();
        }
        updateSelectedCount();
    });
    
    grid.appendChild(item);
    updateCustomAmenitiesDisplay();
    input.value = '';
    
    if (!selectedAmenities.includes(valor)) {
        selectedAmenities.push(valor);
    }
    
    updateSelectedCount();
    showModernAlert('Amenidad personalizada agregada', 'success');
}

function updateCustomAmenitiesDisplay() {
    const container = document.getElementById('customAmenitiesContainer');
    container.innerHTML = customAmenities.map(amenity => `
        <div class="custom-amenity-tag">
            <i class="fas fa-plus-circle" style="color: #f59e0b;"></i>
            <span>${amenity}</span>
            <button type="button" onclick="eliminarComodidadPersonalizada('${amenity}')" class="custom-amenity-remove">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function eliminarComodidadPersonalizada(amenity) {
    customAmenities = customAmenities.filter(a => a !== amenity);
    selectedAmenities = selectedAmenities.filter(a => a !== amenity);
    
    const item = document.querySelector(`[data-name="${amenity.toLowerCase()}"]`);
    if (item) item.remove();
    
    updateCustomAmenitiesDisplay();
    updateSelectedCount();
    showModernAlert('Amenidad personalizada eliminada', 'info');
}

function updateSelectedCount() {
    const countElement = document.getElementById('selectedAmenitiesCount');
    if (countElement) {
        const count = selectedAmenities.length;
        countElement.textContent = `${count} ${count === 1 ? 'amenidad seleccionada' : 'amenidades seleccionadas'}`;
    }
}

function showModernAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
    alert.style.zIndex = '100002';
    
    const colors = {
        'success': 'bg-green-500 text-white',
        'error': 'bg-red-500 text-white',
        'warning': 'bg-orange-500 text-white',
        'info': 'bg-blue-500 text-white'
    };
    
    const icons = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    };
    
    alert.className += ` ${colors[type] || colors.info}`;
    alert.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="${icons[type] || icons.info}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(alert);
    setTimeout(() => { alert.style.transform = 'translateX(0)'; }, 100);
    setTimeout(() => {
        alert.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (alert.parentNode) alert.parentNode.removeChild(alert);
        }, 300);
    }, 3000);
}

function filtrarPorCategoria(categoria) {
    const items = document.querySelectorAll('.amenity-item-modern');
    const buttons = document.querySelectorAll('[data-category]');
    
    buttons.forEach(btn => {
        const badge = btn.querySelector('.badge');
        if (btn.dataset.category === categoria) {
            btn.classList.remove('btn-outline-secondary', 'btn-outline-primary');
            btn.classList.add('btn-primary', 'active');
            if (badge) {
                badge.classList.remove('bg-secondary');
                badge.classList.add('bg-white', 'text-primary');
                badge.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                badge.style.color = 'white';
            }
        } else {
            btn.classList.remove('btn-primary', 'active');
            btn.classList.add('btn-outline-secondary');
            if (badge) {
                badge.classList.remove('bg-white', 'text-primary');
                badge.classList.add('bg-secondary');
                badge.style.backgroundColor = '';
                badge.style.color = '';
            }
        }
    });

    items.forEach(item => {
        const itemCategory = item.dataset.category;
        let mostrar = false;
        
        if (categoria === 'todos') {
            mostrar = true;
        } else if (categoria === 'personalizada' && itemCategory === 'personalizada') {
            mostrar = true;
        } else if (itemCategory === categoria) {
            mostrar = true;
        }
        
        item.style.display = mostrar ? 'flex' : 'none';
    });

    const visibleItems = Array.from(items).filter(item => item.style.display !== 'none');
    const searchResultsCount = document.getElementById('searchResultsCount');
    if (searchResultsCount) {
        searchResultsCount.textContent = `${visibleItems.length} resultados`;
    }
}

function filtrarComodidades() {
    const searchTerm = document.getElementById('amenitiesSearchInput').value.toLowerCase();
    const items = document.querySelectorAll('.amenity-item-modern');
    let visibleCount = 0;
    
    items.forEach(item => {
        const name = item.dataset.name.toLowerCase();
        const isVisible = name.includes(searchTerm);
        item.style.display = isVisible ? 'flex' : 'none';
        if (isVisible) visibleCount++;
    });

    const searchResultsCount = document.getElementById('searchResultsCount');
    if (searchResultsCount) {
        searchResultsCount.textContent = `${visibleCount} resultados`;
    }

    if (searchTerm) {
        document.querySelectorAll('.category-pill').forEach(btn => {
            btn.classList.remove('category-pill-active');
        });
    }
}

function abrirModalComodidades() {
    const modal = document.getElementById('modalComodidades');
    modal.classList.add('modal-overlay--active');
    
    if (!amenitiesData) {
        const grid = document.getElementById('amenitiesGrid');
        if (grid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2.5rem; color: #6366f1;"></i>
                    <p style="margin-top: 1rem; color: #64748b; font-size: 0.875rem;">Cargando comodidades...</p>
                </div>
            `;
        }
        
        cargarComodidades().then(() => {
            setTimeout(() => { restaurarSeleccionComodidades(); }, 100);
        }).catch(error => {
            console.error('Error:', error);
            const grid = document.getElementById('amenitiesGrid');
            if (grid) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; color: #ef4444;"></i>
                        <p style="margin-top: 1rem; color: #64748b; font-size: 0.875rem;">Error al cargar comodidades</p>
                    </div>
                `;
            }
        });
    } else {
        setTimeout(() => { restaurarSeleccionComodidades(); }, 100);
    }
}

function restaurarSeleccionComodidades() {
    selectedAmenities.forEach(amenity => {
        const checkbox = document.querySelector(`input[value="${amenity}"]`);
        if (checkbox) {
            checkbox.checked = true;
            const parentItem = checkbox.closest('.amenity-item-modern');
            if (parentItem) {
                parentItem.classList.add('selected');
            }
        }
    });
    updateSelectedCount();
}

function cerrarModalComodidades() {
    document.getElementById('modalComodidades').classList.remove('modal-overlay--active');
    document.getElementById('amenitiesSearchInput').value = '';
    filtrarPorCategoria('todos');
}

function guardarComodidades() {
    selectedAmenities = [];
    const checkboxes = document.querySelectorAll('#amenitiesGrid input[type="checkbox"]:checked');
    
    checkboxes.forEach(checkbox => {
        selectedAmenities.push(checkbox.value);
    });

    const displayDiv = document.getElementById('selectedAmenitiesDisplay');
    if (selectedAmenities.length > 0) {
        displayDiv.innerHTML = selectedAmenities.map(a => `
            <span style="display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.5rem 0.75rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 500; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3); position: relative; z-index: 1;">
                <i class="fas fa-check-circle"></i> ${a}
            </span>
        `).join('');
    } else {
        displayDiv.innerHTML = '<span class="text-sm text-gray-500">No hay amenidades seleccionadas</span>';
    }

    const hiddenDiv = document.getElementById('hiddenAmenitiesInputs');
    hiddenDiv.innerHTML = '';
    selectedAmenities.forEach(amenity => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'amenities[]';
        input.value = amenity;
        hiddenDiv.appendChild(input);
    });

    showModernAlert('Amenidades guardadas correctamente', 'success');
    cerrarModalComodidades();
}

