    const citySelect = document.getElementById('origen');
    const barrioSelect = document.getElementById('barrio');
    const searchInput = document.getElementById('amenity-search');
    const amenitiesGrid = document.getElementById('amenities-grid');

    function populateCities() {
      const cities = (OPTIONS.ciudades || []).slice().sort((a, b) => a.label.localeCompare(b.label, 'es'));
      cities.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.value;
        opt.textContent = c.label;
        citySelect.appendChild(opt);
      });
    }

    function populateBarrios(city) {
      const barriosObj = OPTIONS.barrios_por_ciudad || {};
      const barrios = (barriosObj[city] || []).slice().sort((a, b) => a.localeCompare(b, 'es'));
      barrioSelect.innerHTML = '<option value="" disabled selected>Selecciona un barrio</option>';
      if (!barrios.length) {
        barrioSelect.disabled = true;
        return;
      }
      barrios.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        barrioSelect.appendChild(opt);
      });
      barrioSelect.disabled = false;
    }

    function renderAmenities(filterText = '') {
      const grouped = AMENITIES.amenities_grouped || {};
      const flat = AMENITIES.amenities || [];
      const used = new Set();
      const query = filterText.trim().toLowerCase();
      amenitiesGrid.innerHTML = '';

      const groups = Object.keys(grouped).length ? grouped : { '': flat };
      
      // Primero contar cuántos items visibles tiene cada grupo
      const groupsWithCount = Object.entries(groups).map(([group, items]) => {
        const visible = [];
        items.forEach(item => {
          if (used.has(item)) return;
          if (query && !item.toLowerCase().includes(query)) return;
          used.add(item);
          visible.push(item);
        });
        return { group, items: visible, count: visible.length };
      }).filter(g => g.count > 0);
      
      // Ordenar por cantidad de items (descendente: mayor a menor)
      groupsWithCount.sort((a, b) => b.count - a.count);

      groupsWithCount.forEach(({ group, items: visible }) => {
        // Ordenar amenities en orden descendente (Z-A)
        visible.sort((a, b) => b.localeCompare(a, 'es'));
        
        const groupDiv = document.createElement('div');
        groupDiv.className = 'amenity-group';
        if (group) {
          const h = document.createElement('h4');
          h.textContent = group;
          groupDiv.appendChild(h);
        }
        visible.forEach(item => {
          const row = document.createElement('label');
          row.className = 'amenity-item';
          row.innerHTML = `<input type="checkbox" name="amenities" value="${item}"><span>${item}</span>`;
          groupDiv.appendChild(row);
        });
        amenitiesGrid.appendChild(groupDiv);
      });
    }

    citySelect.addEventListener('change', () => {
      populateBarrios(citySelect.value);
    });

    if (searchInput) {
      searchInput.addEventListener('input', () => renderAmenities(searchInput.value));
    }

    // Init
    populateCities();
    renderAmenities();

    const formEl = document.querySelector('form');
    const overlay = document.getElementById('loading-overlay');
    if (formEl && overlay) {
      formEl.addEventListener('submit', () => {
        overlay.classList.add('show');
      });
    }
