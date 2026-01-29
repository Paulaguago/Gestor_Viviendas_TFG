import { renderGlobal, fetchEbmLocalLive, renderLocalBars, fetchEbmGlobal, listFeatures, renderPdp } from '/js/models/ebm.js';
import { renderRfImportance } from '/js/models/rf.js';

(async () => {
    const elEbm = document.querySelector('#ebm-global');
    const elRf = document.querySelector('#rf-global');
    const elLocal = document.querySelector('#ebm-local');
    const elCmp = document.querySelector('#cmp-rf-ebm');
    const pdpSelect = document.querySelector('#pdp-feature-select');
    const pdpChartSel = '#pdp-chart';
    // Datos de entrada de esta predicción
    const input = window.__lastInput || null;
    if (!elEbm && !elRf) return;
    try {
        if (elRf) await renderRfImportance('#rf-global', 12);
        if (elEbm) await renderGlobal('#ebm-global', 12);

        // PDP: cargar global JSON, poblar select, render inicial
        const globalJson = await fetchEbmGlobal();
        const feats = listFeatures(globalJson);
        if (pdpSelect && feats && feats.length) {
            pdpSelect.innerHTML = '';
            const top = feats.slice(0, 30); // limitar a 30 para usabilidad
            top.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name; opt.textContent = name; pdpSelect.appendChild(opt);
            });
            renderPdp(pdpChartSel, globalJson, top[0]);
            pdpSelect.addEventListener('change', () => renderPdp(pdpChartSel, globalJson, pdpSelect.value));
        }

        if (elLocal && input) {
            const resp = await fetchEbmLocalLive(input);
            if (resp?.local) renderLocalBars('#ebm-local', resp.local, 12);
            if (elCmp) {
                const rfEur = window.__prediction;
                const ebmEur = resp?.ebm_eur ?? null;
                if (rfEur != null && ebmEur != null) {
                    const diff = Math.abs(rfEur - ebmEur).toFixed(2);
                    elCmp.innerHTML = `
                        <ul class="list-unstyled mb-0">
                            <li><strong>RF:</strong> €${rfEur}</li>
                            <li><strong>EBM:</strong> €${ebmEur}</li>
                            <li class="mt-2">Diferencia absoluta: <strong>€${diff}</strong></li>
                        </ul>`;
                } else {
                    elCmp.innerHTML = '<span class="text-muted">No disponible.</span>';
                }
            }
        }
    } catch (e) {
        console.error('No se pudieron renderizar las explicaciones', e);
        if (elRf) elRf.innerHTML = '<div class="alert alert-warning mb-0">No se pudo cargar la importancia global del RF. Asegúrate de tener feature_importance.json.</div>';
        if (elEbm) elEbm.innerHTML = '<div class="alert alert-warning mb-0 mt-2">No se pudo cargar la explicación global del EBM. Asegúrate de tener ebm_global_explanation.json.</div>';
        if (elLocal) elLocal.innerHTML = '<div class="alert alert-warning">No se pudo obtener la explicación local del EBM.</div>';
    }
})();
