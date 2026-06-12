    import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

    const SUPABASE_URL      = 'https://xyczzekvgahkzlntsils.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_yRetJVmDBuU6XNY08FbXfQ_C9glVlqi';
    const BUNNY_LIBRARY_ID  = '676634';

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });

    const COND = {
      trousse_depart:     'Trousse de départ',
      hernie_discale:     'Hernie discale',
      sciatique:          'Sciatique',
      radiculopathie:     'Radiculopathie',
      stenose_foraminale: 'Sténose foraminale',
      stenose_spinale:    'Sténose spinale',
      arthrose_cervicale: 'Arthrose cervicale',
      arthrose_lombaire:  'Arthrose lombaire',
      spondylolyse:       'Spondylolyse',
      spondylolisthesis:  'Spondylolisthésis',
      autre:              'Autre',
    };

    let allResources = [];
    let allCategories = [];
    let allPatientForms = [];
    const loader = document.getElementById('pageLoader');

    async function loadCategories() {
      const { data } = await supabase
        .from('resource_categories')
        .select('*')
        .order('sort_order');
      allCategories = data || [];
      renderTiles();
    }

    function renderTiles() {
      const nav = document.getElementById('heroNav');
      if (!nav) return;
      const catTabs = allCategories.map(cat => `
        <button class="hero-nav__tab" data-section="${esc(cat.id)}">
          <span class="hero-nav__tab__icon">${cat.icon}</span>
          ${esc(cat.label)}
        </button>`).join('');
      nav.innerHTML = catTabs;
      nav.onclick = e => {
        const tab = e.target.closest('.hero-nav__tab');
        if (tab) openSection(tab.dataset.section);
      };
      // Ouvrir la première section automatiquement
      const firstSection = allCategories[0]?.id || 'exercices';
      openSection(firstSection);
    }

    function getSectionMeta(section) {
      if (section === 'exercices') return { title: 'Mes exercices', sub: 'Exercices prescrits par votre professionnel.' };
      const cat = allCategories.find(c => c.id === section);
      if (cat) {
        const sub = section === 'bibliotheque'
          ? 'Toutes vos ressources, classées par condition.'
          : 'Vos ressources dans cette catégorie.';
        return { title: cat.label, sub };
      }
      return { title: section, sub: '' };
    }

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.replace('/'); return; }

      loader.classList.add('is-hidden');
      setTimeout(() => loader.remove(), 350);

      const user = session.user;
      setGreeting(user);
      initTour();

      const { data: profile } = await supabase.from('profiles').select('is_admin, is_professional').eq('id', user.id).single();
      const isAdmin = profile?.is_admin === true;
      const isPro = profile?.is_professional === true;
      if (isAdmin && !isPro) document.getElementById('btnAdmin').style.display = 'flex';
      if (isPro) document.getElementById('btnProfessionnel').style.display = 'flex';

      await Promise.all([loadCategories(), loadResources(user.id, isAdmin), loadPatientForms(user.id, isAdmin), loadNextAppointment(user.id)]);
    }

    async function loadNextAppointment(userId) {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('appointments')
        .select('appointment_at')
        .eq('patient_id', userId)
        .gte('appointment_at', now)
        .order('appointment_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const banner = document.getElementById('appointmentBanner');
      if (!data) { banner.style.display = 'none'; return; }

      const dt = new Date(data.appointment_at);
      const dateStr = dt.toLocaleDateString('fr-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const timeStr = dt.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
      document.getElementById('appointmentText').textContent = `${dateStr} à ${timeStr}`;
      banner.style.display = 'flex';
    }

    function setGreeting(user) {
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
      const h = new Date().getHours();
      const s = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
      document.getElementById('greeting').innerHTML = `${s}, <strong>${esc(name.split(' ')[0])}</strong>`;
    }

    async function loadResources(userId, isAdmin = false) {
      try {
        let resources;
        if (isAdmin) {
          const { data, error } = await supabase.from('resources').select('*').order('condition_tag').order('sort_order');
          if (error) throw error;
          resources = data;
        } else {
          const { data, error } = await supabase.from('patient_resources').select(`assigned_at, resource:resources (id,title,description,type,condition_tag,category,bunny_video_id,pdf_url,thumbnail_url,duration_sec,sort_order)`).order('assigned_at', { ascending: false });
          if (error) throw error;
          resources = data.map(r => ({ ...r.resource, assigned_at: r.assigned_at })).filter(r => r?.id);
        }
        allResources = resources.sort((a, b) => a.sort_order - b.sort_order);
        renderCategories();
      } catch (e) {
        renderError(); toast('Impossible de charger vos ressources.', 'error');
      }
    }

    async function loadPatientForms(userId, isAdmin = false) {
      try {
        let query = supabase.from('patient_forms').select(`category, form:forms(id, title, description, pdf_url, has_fields)`);
        if (!isAdmin) query = query.eq('patient_id', userId);
        const { data, error } = await query;
        if (error) throw error;

        const forms = (data || []).map(r => ({ ...r.form, category: r.category, _isForm: true })).filter(r => r?.id);

        // Pour chaque formulaire remplissable, charger le nb de champs
        const fillable = forms.filter(f => f.has_fields);
        if (fillable.length) {
          const counts = await Promise.all(fillable.map(f =>
            supabase.from('form_fields').select('id', { count: 'exact', head: true }).eq('form_id', f.id)
          ));
          fillable.forEach((f, i) => { f._fieldCount = counts[i].count || 0; });
        }
        forms.filter(f => !f.has_fields).forEach(f => { f._fieldCount = 0; });

        allPatientForms = forms;
      } catch {
        allPatientForms = [];
      }
    }

    function renderFilters() {
      const filtersEl = document.getElementById('filters');
      const counts = {};
      allResources.forEach(r => { counts[r.condition_tag] = (counts[r.condition_tag]||0)+1; });
      if (Object.keys(counts).length <= 1) { filtersEl.style.display = 'none'; return; }
      const btns = [{ k:'all', l:'Tout', n:allResources.length }, ...Object.entries(counts).map(([k,n]) => ({ k, l:COND[k]||k, n }))];
      filtersEl.innerHTML = btns.map(b => `<button class="filter-btn${b.k==='all'?' is-active':''}" data-filter="${b.k}">${b.l}<span class="count">${b.n}</span></button>`).join('');
      filtersEl.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          filtersEl.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('is-active', b===btn));
          renderGrid(btn.dataset.filter);
        });
      });
    }

    function renderGrid(filter) {
      const list = filter === 'all' ? allResources : allResources.filter(r => r.condition_tag === filter);
      const grid = document.getElementById('grid');
      if (!list.length) {
        grid.innerHTML = `<div class="state-wrap"><div class="state-icon"><svg viewBox="0 0 24 24"><path d="M22 16.74V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h16"/><path d="M7 8h10M7 12h6"/></svg></div><p class="state-title">Aucune ressource ici</p><p class="state-text">Votre équipe n'a pas encore assigné de ressources pour cette condition.</p></div>`;
        return;
      }
      grid.innerHTML = list.map(r => renderCard(r)).join('');
      grid.querySelectorAll('.card').forEach(c => {
        c.addEventListener('click', () => {
          if (c.dataset.type==='video') openModal(c.dataset.id, c.dataset.title, c.dataset.url);
          else window.open(c.dataset.url, '_blank', 'noopener');
        });
        c.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); c.click(); } });
      });
    }

    function renderCard(r) {
      const isVideo = r.type === 'video';
      const condLabel = COND[r.condition_tag] || r.condition_tag;
      const embedUrl = isVideo ? `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${r.bunny_video_id}?autoplay=true&responsive=true` : '';
      const thumb = r.thumbnail_url ? `<img src="${esc(r.thumbnail_url)}" alt="" loading="lazy">` : `<div class="card__thumb-bg">${isVideo ? svgVideo() : svgPdf()}</div>`;
      const dur = isVideo && r.duration_sec ? `<span class="card__duration">${fmtDur(r.duration_sec)}</span>` : '';

      if (isVideo) {
        return `<article class="card" role="listitem" tabindex="0" data-id="${r.id}" data-type="video" data-url="${esc(embedUrl)}" data-title="${esc(r.title)}">
          <div class="card__thumb">
            ${thumb}
            <div class="card__overlay"></div>
            <div class="card__play"><div class="card__play-btn"><svg viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></div>
            <p class="card__img-title">${esc(r.title)}</p>
            ${dur}
          </div>
          <div class="card__body">
            <div class="card__meta">
              <span class="badge badge--video">Vidéo</span>
              <span class="badge badge--c-${r.condition_tag}">${condLabel}</span>
            </div>
            ${r.description ? `<p class="card__desc">${esc(r.description)}</p>` : ''}
            <p class="card__cta"><svg viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg> Visionner la vidéo</p>
          </div>
        </article>`;
      } else {
        return `<article class="card" role="listitem" tabindex="0" data-id="${r.id}" data-type="pdf" data-url="${esc(r.pdf_url||'')}" data-title="${esc(r.title)}">
          <div class="card__thumb">${thumb}</div>
          <div class="card__body">
            <div class="card__meta">
              <span class="badge badge--pdf">PDF</span>
              <span class="badge badge--c-${r.condition_tag}">${condLabel}</span>
            </div>
            <h2 class="card__title">${esc(r.title)}</h2>
            ${r.description ? `<p class="card__desc">${esc(r.description)}</p>` : ''}
            <p class="card__cta"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Ouvrir le PDF</p>
          </div>
        </article>`;
      }
    }

    // ── Modal vidéo ressources ────────────────────────────
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle   = document.getElementById('modalTitle');
    const modalVideo   = document.getElementById('modalVideo');
    document.getElementById('modalClose').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => { if (e.target===modalOverlay) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key==='Escape' && modalOverlay.classList.contains('is-open')) closeModal(); });

    function openModal(id, title, url) {
      modalTitle.textContent = title;
      modalVideo.innerHTML = `<iframe src="${url}" allowfullscreen allow="autoplay"></iframe>`;
      modalOverlay.classList.add('is-open');
      modalOverlay.setAttribute('aria-hidden','false');
      document.body.style.overflow = 'hidden';
    }
    function closeModal() {
      modalOverlay.classList.remove('is-open');
      modalOverlay.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
      setTimeout(() => { modalVideo.innerHTML = ''; }, 300);
    }

    // ── Déconnexion ───────────────────────────────────────
    document.getElementById('btnSignout').addEventListener('click', async () => {
      await supabase.auth.signOut(); window.location.replace('/');
    });

    function renderError() {
      document.getElementById('viewCategories').style.display = '';
      document.getElementById('viewResources').style.display  = 'none';
      document.getElementById('categoriesGrid').innerHTML = `<div class="state-wrap"><div class="state-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><p class="state-title">Erreur de chargement</p><p class="state-text">Rechargez la page ou contactez la clinique.</p></div>`;
    }

    function toast(msg, type='info') {
      const el = document.createElement('div');
      el.className = `toast${type!=='info'?' toast--'+type:''}`;
      el.textContent = msg;
      document.getElementById('toasts').appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }
    function fmtDur(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }
    function esc(s) { return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function svgVideo() { return `<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.5" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`; }
    function svgPdf()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`; }

    init().catch(() => { loader.classList.add('is-hidden'); renderError(); });

    // ── NAVIGATION PAR ONGLETS ────────────────────────────

    function openSection(section) {
      const meta = getSectionMeta(section);

      // Pas de sous-titre — les onglets occupent toute la place

      // Marquer l'onglet actif
      document.querySelectorAll('.hero-nav__tab').forEach(t => {
        t.classList.toggle('is-active', t.dataset.section === section);
      });

      // Afficher la bonne section
      document.querySelectorAll('.section-view').forEach(s => s.style.display = 'none');

      const cat = allCategories.find(c => c.id === section);
      const isProgramme = section === 'exercices' || cat?.shows_programme;

      if (isProgramme) {
        document.getElementById('section-exercices').style.display = '';
        if (!programmeLoaded) loadProgramme();
      } else {
        document.getElementById('section-cat').style.display = '';
        renderCatGrid(section);
      }
    }

    // Grille filtrée par catégorie de ressource
    function renderCatGrid(category) {
      const resources = allResources.filter(r => (r.category || 'bibliotheque') === category);
      const forms     = allPatientForms.filter(f => f.category === category);
      const list      = [...resources, ...forms];
      const grid      = document.getElementById('catGrid');
      if (!list.length) {
        grid.innerHTML = `<div class="state-wrap"><div class="state-icon"><svg viewBox="0 0 24 24"><path d="M22 16.74V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h16"/><path d="M7 8h10M7 12h6"/></svg></div><p class="state-title">Rien ici pour l'instant</p><p class="state-text">Votre équipe n'a pas encore ajouté de contenu dans cette section.</p></div>`;
        return;
      }
      grid.innerHTML = list.map(r => r._isForm ? renderFormCard(r) : renderCard(r)).join('');
      grid.querySelectorAll('.card').forEach(c => {
        c.addEventListener('click', () => {
          if (c.dataset.type === 'video') openModal(c.dataset.id, c.dataset.title, c.dataset.url);
          else if (c.dataset.type === 'form') openFillForm(c.dataset.id, c.dataset.title);
          else window.open(c.dataset.url, '_blank', 'noopener');
        });
        c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.click(); } });
      });
    }

    function renderFormCard(f) {
      const hasFields = f._fieldCount > 0;
      return `<article class="card" role="listitem" tabindex="0" data-id="${esc(f.id)}" data-type="${hasFields ? 'form' : 'pdf'}" data-url="${esc(f.pdf_url||'')}" data-title="${esc(f.title)}">
        <div class="card__thumb"><div class="card__thumb-bg">${svgPdf()}</div></div>
        <div class="card__body">
          <div class="card__meta">
            <span class="badge badge--pdf">📋 Formulaire</span>
            ${hasFields ? `<span class="badge" style="background:#e6f5ed;color:#1a8c4e">✓ Remplissable</span>` : ''}
          </div>
          <h2 class="card__title">${esc(f.title)}</h2>
          ${f.description ? `<p class="card__desc">${esc(f.description)}</p>` : ''}
          ${hasFields
            ? `<p class="card__cta" style="color:#185FA5"><svg viewBox="0 0 24 24" width="14" height="14"><polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg> Remplir en ligne</p>`
            : `<p class="card__cta"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> Ouvrir le formulaire</p>`
          }
        </div>
      </article>`;
    }

    // ── Remplir un formulaire en ligne ────────────────────
    const modalFill    = document.getElementById('modalFillForm');
    const fillFields   = document.getElementById('fillFormFields');
    const fillMsg      = document.getElementById('fillFormMsg');
    let   fillFormId   = null;
    let   fillFormData = null; // { fields, patientName }

    async function openFillForm(formId, title) {
      fillFormId = formId;
      document.getElementById('fillFormTitle').textContent = title;
      document.getElementById('fillFormDesc').textContent  = '';
      fillFields.innerHTML = `<div style="text-align:center;padding:1.5rem;color:#5a7085">Chargement…</div>`;
      fillMsg.textContent  = '';
      modalFill.style.display = 'flex';
      modalFill.setAttribute('aria-hidden','false');
      document.body.style.overflow = 'hidden';

      const { data: fields } = await supabase
        .from('form_fields').select('*').eq('form_id', formId).order('sort_order');

      fillFormData = fields || [];
      renderFillFields(fillFormData);
    }

    function renderFillFields(fields) {
      if (!fields.length) { fillFields.innerHTML = `<p style="color:#5a7085;font-size:.85rem">Ce formulaire ne contient aucun champ.</p>`; return; }
      fillFields.innerHTML = fields.map(f => {
        const req = f.required ? `<span style="color:#c0392b;margin-left:.2rem">*</span>` : '';
        const labelHtml = `<label style="display:block;font-size:.85rem;font-weight:700;color:#1a2b3c;margin-bottom:.35rem">${esc(f.label)}${req}</label>`;
        let input = '';
        if (f.type === 'text')     input = `<input type="text"     data-field="${esc(f.id)}" ${f.required?'required':''} style="width:100%;padding:.5rem .75rem;border:1.5px solid #ccdaeb;border-radius:8px;font-size:.88rem;font-family:inherit;outline:none">`;
        if (f.type === 'textarea') input = `<textarea               data-field="${esc(f.id)}" ${f.required?'required':''} rows="3" style="width:100%;padding:.5rem .75rem;border:1.5px solid #ccdaeb;border-radius:8px;font-size:.88rem;font-family:inherit;outline:none;resize:vertical"></textarea>`;
        if (f.type === 'number')   input = `<input type="number"   data-field="${esc(f.id)}" ${f.required?'required':''} style="width:100%;padding:.5rem .75rem;border:1.5px solid #ccdaeb;border-radius:8px;font-size:.88rem;font-family:inherit;outline:none">`;
        if (f.type === 'date')     input = `<input type="date"     data-field="${esc(f.id)}" ${f.required?'required':''} style="width:100%;padding:.5rem .75rem;border:1.5px solid #ccdaeb;border-radius:8px;font-size:.88rem;font-family:inherit;outline:none">`;
        if (f.type === 'checkbox') input = `<label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.88rem"><input type="checkbox" data-field="${esc(f.id)}" style="width:18px;height:18px;accent-color:#185FA5"> Oui</label>`;
        if (f.type === 'radio') {
          const opts = (f.options || '').split(',').map(o => o.trim()).filter(Boolean);
          input = opts.map(opt => `<label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.88rem;margin-bottom:.3rem"><input type="radio" name="field_${esc(f.id)}" data-field="${esc(f.id)}" value="${esc(opt)}" style="width:16px;height:16px;accent-color:#185FA5"> ${esc(opt)}</label>`).join('');
        }
        return `<div style="margin-bottom:1rem">${labelHtml}${input}</div>`;
      }).join('');
    }

    document.getElementById('btnSubmitForm').addEventListener('click', async () => {
      if (!fillFormId || !fillFormData) return;
      const btn = document.getElementById('btnSubmitForm');

      // Collecter les réponses
      const answers = {};
      let missing = false;
      fillFormData.forEach(f => {
        if (f.type === 'checkbox') {
          const el = fillFields.querySelector(`[data-field="${f.id}"]`);
          answers[f.id] = el ? el.checked : false;
        } else if (f.type === 'radio') {
          const el = fillFields.querySelector(`input[name="field_${f.id}"]:checked`);
          answers[f.id] = el ? el.value : '';
          if (f.required && !answers[f.id]) missing = true;
        } else {
          const el = fillFields.querySelector(`[data-field="${f.id}"]`);
          answers[f.id] = el ? el.value.trim() : '';
          if (f.required && !answers[f.id]) missing = true;
        }
      });

      if (missing) { fillMsg.textContent = '⚠️ Veuillez remplir tous les champs obligatoires.'; fillMsg.style.color = '#c0392b'; return; }

      btn.disabled = true; btn.textContent = '⏳ Envoi…';
      fillMsg.textContent = '';

      const { data: { session } } = await supabase.auth.getSession();
      const name = session?.user?.user_metadata?.full_name || session?.user?.email || 'Patient';

      const { error } = await supabase.from('form_submissions').insert({
        form_id: fillFormId, patient_id: session.user.id, patient_name: name, answers,
      });

      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Soumettre le formulaire`;

      if (error) { fillMsg.textContent = '❌ Erreur : ' + error.message; fillMsg.style.color = '#c0392b'; return; }

      fillFields.innerHTML = `<div style="text-align:center;padding:2rem"><div style="font-size:2.5rem;margin-bottom:.75rem">✅</div><p style="font-size:1rem;font-weight:700;color:#1a8c4e">Formulaire soumis !</p><p style="font-size:.85rem;color:#5a7085;margin-top:.35rem">Votre équipe de soins a été notifiée.</p></div>`;
      document.getElementById('fillFormFooter').style.display = 'none';
      setTimeout(() => closeFillForm(), 2500);
    });

    function closeFillForm() {
      modalFill.style.display = 'none';
      modalFill.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
      document.getElementById('fillFormFooter').style.display = 'flex';
      fillFormId = null; fillFormData = null;
    }
    document.getElementById('fillFormClose').addEventListener('click', closeFillForm);
    document.getElementById('btnCancelFillForm').addEventListener('click', closeFillForm);
    modalFill.addEventListener('click', e => { if (e.target === modalFill) closeFillForm(); });

    document.getElementById('btnBackCategories').addEventListener('click', () => {
      document.getElementById('viewResources').style.display = 'none';
      document.getElementById('viewCategories').style.display = '';
      document.getElementById('heroTitle').textContent = 'Ma bibliothèque';
      document.getElementById('heroSub').textContent = 'Toutes vos ressources, classées par condition.';
    });

    document.getElementById('btnPrint').addEventListener('click', () => {
      document.getElementById('printDate').textContent =
        new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
      window.print();
    });

    document.getElementById('btnBackProgramme').addEventListener('click', () => {
      document.getElementById('viewExercises').style.display = 'none';
      document.getElementById('viewProgrammeSummary').style.display = '';
      activeProgramme = null;
    });

    // ── CATÉGORIES ───────────────────────────────────────
    function getCatIcon(tag) {
      return `<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>`;
    }

    function renderCategories() {
      const grid = document.getElementById('categoriesGrid');
      const groups = {};
      allResources.forEach(r => {
        const tag = r.condition_tag;
        if (!groups[tag]) groups[tag] = { videos: 0, pdfs: 0 };
        if (r.type === 'video') groups[tag].videos++;
        else groups[tag].pdfs++;
      });

      if (!Object.keys(groups).length) {
        grid.innerHTML = `<div class="state-wrap">
          <div class="state-icon"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div>
          <p class="state-title">Aucune ressource disponible</p>
          <p class="state-text">Votre équipe n'a pas encore assigné de ressources à votre dossier.</p>
        </div>`;
        return;
      }

      grid.innerHTML = Object.entries(groups).map(([tag, counts]) => `
        <button class="cat-card" data-tag="${esc(tag)}" aria-label="${esc(COND[tag] || tag)}">
          <div class="cat-card__icon"><svg viewBox="0 0 24 24">${getCatIcon(tag)}</svg></div>
          <div class="cat-card__info">
            <div class="cat-card__name">${esc(COND[tag] || tag)}</div>
            <div class="cat-card__badges">
              ${counts.videos ? `<span class="cat-badge cat-badge--video">▶ ${counts.videos} vidéo${counts.videos > 1 ? 's' : ''}</span>` : ''}
              ${counts.pdfs   ? `<span class="cat-badge cat-badge--pdf">📄 ${counts.pdfs} PDF</span>` : ''}
            </div>
          </div>
          <svg class="cat-card__arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      `).join('');

      grid.querySelectorAll('.cat-card').forEach(card => {
        card.addEventListener('click', () => openCategory(card.dataset.tag));
      });
    }

    function openCategory(tag) {
      document.getElementById('viewCategories').style.display = 'none';
      document.getElementById('viewResources').style.display = '';
      document.getElementById('heroTitle').textContent = COND[tag] || tag;
      document.getElementById('heroSub').textContent = 'Ressources pour cette condition.';
      renderGrid(tag);
    }

    // ── MODULE PROGRAMME ──────────────────────────────────
    let programmeLoaded = false;
    let currentUserId   = null;
    let allProgrammes   = [];
    let activeProgramme = null;
    let programmeData   = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) currentUserId = session.user.id;
    });

    async function loadProgramme() {
      programmeLoaded = true;
      const summaryEl = document.getElementById('programmeSummary');
      summaryEl.innerHTML = `<div class="state-wrap"><div class="spinner"></div></div>`;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
          .from('programmes')
          .select('id, name, description, created_at, section_id, section:programme_sections(name, sort_order)')
          .eq('patient_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        allProgrammes = data || [];

        // Un seul programme → ouvrir directement, sans afficher la liste
        if (allProgrammes.length === 1) {
          openProgramme(allProgrammes[0].id);
        } else {
          renderProgrammeSummary();
        }

      } catch(e) {
        document.getElementById('programmeSummary').innerHTML = `<div class="state-wrap"><div class="state-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><p class="state-title">Erreur de chargement</p><p class="state-text">Rechargez la page ou contactez la clinique.</p></div>`;
      }
    }

    function renderProgrammeSummary() {
      const summaryEl = document.getElementById('programmeSummary');
      if (!allProgrammes.length) {
        summaryEl.innerHTML = `<div class="state-wrap">
          <div class="state-icon"><svg viewBox="0 0 24 24"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg></div>
          <p class="state-title">Aucun programme pour l'instant</p>
          <p class="state-text">Votre professionnel n'a pas encore créé de programme.</p>
        </div>`;
        return;
      }
      const cardHtml = p => `
        <div class="prog-card" data-prog-id="${p.id}">
          <div class="prog-card__icon">🗂️</div>
          <div class="prog-card__body">
            <div class="prog-card__title">${esc(p.name)}</div>
            <div class="prog-card__meta">${p.description ? esc(p.description) : 'Appuyer pour voir les exercices →'}</div>
          </div>
        </div>`;

      // Regrouper par grand titre. Ordre : sort_order de la section, puis sans titre à la fin.
      const sectionsMap = new Map();
      const noSection = [];
      allProgrammes.forEach(p => {
        if (p.section?.name) {
          const key = p.section.name;
          if (!sectionsMap.has(key)) sectionsMap.set(key, { order: p.section.sort_order ?? 999, items: [] });
          sectionsMap.get(key).items.push(p);
        } else {
          noSection.push(p);
        }
      });
      const groups = [...sectionsMap.entries()]
        .sort((a, b) => a[1].order - b[1].order)
        .map(([title, g]) => ({ title, items: g.items }));
      if (noSection.length) groups.push({ title: null, items: noSection });

      // S'il n'y a aucun grand titre du tout, affichage simple sans en-tête
      const hasSections = sectionsMap.size > 0;
      summaryEl.innerHTML = groups.map(g => `
        ${hasSections && g.title ? `<h2 class="prog-section-title">${esc(g.title)}</h2>` : ''}
        <div class="prog-cards">${g.items.map(cardHtml).join('')}</div>
      `).join('');

      summaryEl.querySelectorAll('.prog-card').forEach(card => {
        card.addEventListener('click', () => openProgramme(card.dataset.progId));
      });
    }

    async function openProgramme(programmeId) {
      activeProgramme = allProgrammes.find(p => p.id === programmeId);

      // Masquer la liste, afficher les exercices
      document.getElementById('viewProgrammeSummary').style.display = 'none';
      document.getElementById('viewExercises').style.display = '';

      // Bouton retour : visible seulement si plusieurs programmes
      const btnBack = document.getElementById('btnBackProgramme');
      btnBack.style.display = allProgrammes.length > 1 ? '' : 'none';

      // Navigation tabs entre programmes (si > 1)
      renderProgNav(programmeId);

      // Nom du programme
      const titleEl = document.getElementById('progTitle');
      titleEl.innerHTML = `<span class="prog-title__icon">🗂️</span>${esc(activeProgramme?.name || 'Mon programme')}`;

      const grid = document.getElementById('exerciseGrid');
      grid.innerHTML = `<div class="state-wrap"><div class="spinner"></div></div>`;

      try {
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);

        const { data, error } = await supabase
          .from('patient_exercises')
          .select(`
            id, sets, reps, rest_sec, frequency, notes, sort_order,
            exercise:exercises (
              id, title, description, bunny_video_id, thumbnail_url, muscle_group,
              exercise_images (url, sort_order)
            )
          `)
          .eq('programme_id', programmeId)
          .order('sort_order');

        if (error) throw error;

        // Ne charger que les logs des exercices de CE programme (pas tout l'historique)
        const exIds = (data || []).map(pe => pe.exercise?.id).filter(Boolean);
        const { data: logs }    = exIds.length ? await supabase.from('exercise_logs').select('exercise_id').in('exercise_id', exIds).gte('completed_at', todayStart.toISOString()) : { data: [] };
        const { data: allLogs } = exIds.length ? await supabase.from('exercise_logs').select('exercise_id').in('exercise_id', exIds) : { data: [] };

        const completedToday = new Set((logs||[]).map(l => l.exercise_id));
        const logCounts = {};
        (allLogs||[]).forEach(l => { logCounts[l.exercise_id] = (logCounts[l.exercise_id]||0)+1; });

        programmeData = { exercises: data || [], completedToday, logCounts };
        showExercises();
        renderProgressCalendar();

      } catch(e) {
        grid.innerHTML = `<div class="state-wrap"><p class="state-title">Erreur de chargement</p></div>`;
      }
    }

    function renderProgNav(activeProgrammeId) {
      const navEl = document.getElementById('progNav');
      if (allProgrammes.length <= 1) {
        navEl.style.display = 'none';
        return;
      }
      navEl.style.display = 'flex';
      navEl.innerHTML = allProgrammes.map(p => `
        <button
          class="prog-nav__btn${p.id === activeProgrammeId ? ' is-active' : ''}"
          data-prog-id="${p.id}"
          aria-label="Programme : ${esc(p.name)}"
        >${esc(p.name)}</button>
      `).join('');

      navEl.querySelectorAll('.prog-nav__btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.progId !== activeProgramme?.id) {
            openProgramme(btn.dataset.progId);
          }
        });
      });
    }

    function showExercises() {
      const { exercises, completedToday, logCounts } = programmeData;
      const grid = document.getElementById('exerciseGrid');

      if (!exercises.length) {
        grid.innerHTML = `<div class="state-wrap">
          <div class="state-icon"><svg viewBox="0 0 24 24"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg></div>
          <p class="state-title">Aucun exercice dans ce programme</p>
        </div>`;
        return;
      }

      grid.innerHTML = exercises.map(pe =>
        renderExerciseCard(pe, completedToday.has(pe.exercise?.id), logCounts[pe.exercise?.id] || 0)
      ).join('');

      // Clic sur toute la carte → modal de détail
      grid.querySelectorAll('.ex-card').forEach(card => {
        card.addEventListener('click', e => {
          // Ne pas ouvrir le modal si on clique sur le bouton "compléter"
          if (e.target.closest('.btn-complete')) return;
          const peId = card.dataset.peId;
          const pe = programmeData.exercises.find(p => p.id === peId);
          if (pe) openExerciseModal(pe);
        });
        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
        });
      });

      // Bouton compléter
      grid.querySelectorAll('.btn-complete').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); toggleComplete(btn); });
      });

      // Init carousels
      grid.querySelectorAll('.carousel').forEach(initCarousel);
    }

    function renderExerciseCard(pe, doneToday, totalCount) {
      const ex       = pe.exercise;
      const hasVideo = !!ex.bunny_video_id;
      const images   = (ex.exercise_images || []).sort((a,b) => a.sort_order - b.sort_order);
      const allImgs  = images.length > 0 ? images : (ex.thumbnail_url ? [{ url: ex.thumbnail_url }] : []);
      const firstImg = allImgs[0];

      // Thumbnail : première photo en format carré
      let thumbContent = '';
      if (hasVideo) {
        // Vidéo : fond sombre + bouton play + titre
        const cover = firstImg
          ? `<img src="${esc(firstImg.url)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">`
          : `<div class="ex-card__thumb-bg" style="position:absolute;inset:0;">${svgExercise()}</div>`;
        thumbContent = `
          ${cover}
          <div class="ex-card__overlay"></div>
          <div class="ex-card__play"><div class="ex-card__play-btn"><svg viewBox="0 0 24 24" fill="white" style="width:18px;height:18px;margin-left:3px"><polygon points="5 3 19 12 5 21 5 3"/></svg></div></div>
          <p class="ex-card__title-overlay">${esc(ex.title)}</p>
          <span class="ex-card__hint">▶ Voir la vidéo</span>`;
      } else if (firstImg) {
        // Photo : image complète visible
        thumbContent = `
          <img src="${esc(firstImg.url)}" alt="${esc(ex.title)}" loading="lazy" style="width:100%;height:100%;object-fit:contain;">
          <span class="ex-card__hint">🔍 Agrandir</span>`;
      } else {
        // Aucun média
        thumbContent = `<div class="ex-card__thumb-bg" style="position:absolute;inset:0;">${svgExercise()}</div>`;
      }

      const params = [
        pe.sets     ? `<div class="ex-param"><span class="ex-param__label">Séries</span><span class="ex-param__value">${pe.sets}</span></div>` : '',
        pe.reps     ? `<div class="ex-param"><span class="ex-param__label">Répétitions</span><span class="ex-param__value">${esc(pe.reps)}</span></div>` : '',
        pe.rest_sec ? `<div class="ex-param"><span class="ex-param__label">Repos</span><span class="ex-param__value">${fmtRest(pe.rest_sec)}</span></div>` : '',
        pe.frequency? `<div class="ex-param"><span class="ex-param__label">Fréquence</span><span class="ex-param__value">${esc(pe.frequency)}</span></div>` : '',
      ].filter(Boolean).join('');

      return `<div class="ex-card" tabindex="0" data-pe-id="${pe.id}" aria-label="${esc(ex.title)} — appuyer pour les détails">
        <div class="ex-card__thumb" style="position:relative;">
          ${thumbContent}
        </div>
        <div class="ex-card__body">
          ${ex.muscle_group ? `<span class="muscle-badge">💪 ${esc(ex.muscle_group)}</span>` : ''}
          ${!hasVideo ? `<h3 style="font-size:.95rem;font-weight:700;color:var(--text);letter-spacing:-.01em;line-height:1.35">${esc(ex.title)}</h3>` : ''}
          ${params ? `<div class="ex-params">${params}</div>` : ''}
          <button class="btn-complete${doneToday?' is-done':''}" data-exercise="${esc(ex.id)}" data-done="${doneToday}">
            <svg viewBox="0 0 24 24">${doneToday?'<path d="M20 6L9 17l-5-5"/>':'<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>'}</svg>
            ${doneToday ? 'Complété aujourd\'hui ✓' : 'Marquer comme complété'}
          </button>
          ${totalCount > 0 ? `<p class="ex-streak"><strong>${totalCount}</strong> séance${totalCount>1?'s':''} complétée${totalCount>1?'s':''} au total</p>` : ''}
        </div>
      </div>`;
    }

    // ── Modal de détail exercice ──────────────────────────
    const exModalOverlay = document.getElementById('exModalOverlay');
    document.getElementById('exModalClose').addEventListener('click', closeExModal);
    exModalOverlay.addEventListener('click', e => { if (e.target === exModalOverlay) closeExModal(); });

    function openExerciseModal(pe) {
      const ex       = pe.exercise;
      const hasVideo = !!ex.bunny_video_id;
      const images   = (ex.exercise_images || []).sort((a,b) => a.sort_order - b.sort_order);
      const allImgs  = images.length > 0 ? images : (ex.thumbnail_url ? [{ url: ex.thumbnail_url }] : []);

      // ── Zone média ──
      const mediaEl = document.getElementById('exModalMedia');
      if (hasVideo) {
        const embedUrl = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${ex.bunny_video_id}?autoplay=true&responsive=true`;
        mediaEl.innerHTML = `<iframe src="${embedUrl}" allowfullscreen allow="autoplay" style="width:100%;aspect-ratio:16/9;border:none;display:block;"></iframe>`;
      } else if (allImgs.length > 0) {
        const imgUrls = allImgs.map(i => i.url);
        mediaEl.innerHTML = `
          <div class="ex-modal__media-photo" id="exModalMainPhoto" onclick="openLightbox(${JSON.stringify(imgUrls)}, 0)">
            <img src="${esc(imgUrls[0])}" alt="${esc(ex.title)}" id="exModalMainImg">
          </div>
          ${allImgs.length > 1 ? `
            <div class="ex-modal__photos" id="exModalThumbs">
              ${allImgs.map((img, i) => `
                <div class="ex-modal__photo-thumb${i===0?' is-active':''}" data-idx="${i}" data-url="${esc(img.url)}">
                  <img src="${esc(img.url)}" alt="Photo ${i+1}">
                </div>`).join('')}
            </div>` : ''}`;

        // Clics sur les miniatures
        mediaEl.querySelectorAll('.ex-modal__photo-thumb').forEach(thumb => {
          thumb.addEventListener('click', () => {
            mediaEl.querySelectorAll('.ex-modal__photo-thumb').forEach(t => t.classList.remove('is-active'));
            thumb.classList.add('is-active');
            document.getElementById('exModalMainImg').src = thumb.dataset.url;
            document.getElementById('exModalMainPhoto').onclick = () =>
              openLightbox(allImgs.map(i => i.url), parseInt(thumb.dataset.idx));
          });
        });
      } else {
        mediaEl.innerHTML = `<div class="ex-modal__media-empty">${svgExercise()}</div>`;
      }

      // ── Corps ──
      const params = [
        pe.sets     ? { label: 'Séries',      value: pe.sets + ' séries' } : null,
        pe.reps     ? { label: 'Répétitions',  value: pe.reps + ' reps' }  : null,
        pe.rest_sec ? { label: 'Repos',        value: fmtRest(pe.rest_sec) } : null,
        pe.frequency? { label: 'Fréquence',    value: pe.frequency }        : null,
      ].filter(Boolean);

      document.getElementById('exModalBody').innerHTML = `
        <div class="ex-modal__header">
          <h2 class="ex-modal__title">${esc(ex.title)}</h2>
          ${ex.muscle_group ? `<span class="ex-modal__muscle">💪 ${esc(ex.muscle_group)}</span>` : ''}
        </div>
        ${ex.description ? `<p class="ex-modal__desc">${esc(ex.description)}</p>` : ''}
        ${params.length ? `
          <div class="ex-modal__params">
            ${params.map(p => `
              <div class="ex-modal__param">
                <div class="ex-modal__param-label">${p.label}</div>
                <div class="ex-modal__param-value">${esc(p.value)}</div>
              </div>`).join('')}
          </div>` : ''}
        ${pe.notes ? `<div class="ex-modal__note"><strong>📝 Note du professionnel</strong>${esc(pe.notes)}</div>` : ''}`;

      exModalOverlay.classList.add('is-open');
      exModalOverlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    let exModalClearTimer = null;
    function closeExModal() {
      exModalOverlay.classList.remove('is-open');
      exModalOverlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      clearTimeout(exModalClearTimer);
      exModalClearTimer = setTimeout(() => {
        document.getElementById('exModalMedia').innerHTML = '';
        document.getElementById('exModalBody').innerHTML = '';
      }, 300);
    }

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (exModalOverlay.classList.contains('is-open')) closeExModal();
        else if (modalOverlay.classList.contains('is-open')) closeModal();
      }
    });

    // ── Compléter un exercice ─────────────────────────────
    async function toggleComplete(btn) {
      if (!currentUserId) { toast('Session expirée. Rechargez la page.', 'error'); return; }
      const exerciseId = btn.dataset.exercise;
      const isDone = btn.dataset.done === 'true';
      btn.disabled = true;

      if (!isDone) {
        const { error } = await supabase.from('exercise_logs').insert({ patient_id: currentUserId, exercise_id: exerciseId });
        if (!error) {
          btn.dataset.done = 'true';
          btn.classList.add('is-done');
          btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> Complété aujourd'hui ✓`;
          toast('Exercice complété ! 💪', 'success');
          const streak = btn.parentElement.querySelector('.ex-streak');
          if (streak) {
            const n = parseInt(streak.querySelector('strong').textContent) + 1;
            streak.innerHTML = `<strong>${n}</strong> séance${n>1?'s':''} complétée${n>1?'s':''} au total`;
          } else {
            const s = document.createElement('p');
            s.className = 'ex-streak';
            s.innerHTML = `<strong>1</strong> séance complétée au total`;
            btn.after(s);
          }
        }
      } else {
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const { error } = await supabase.from('exercise_logs').delete().eq('patient_id', currentUserId).eq('exercise_id', exerciseId).gte('completed_at', todayStart.toISOString());
        if (!error) {
          btn.dataset.done = 'false';
          btn.classList.remove('is-done');
          btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> Marquer comme complété`;
        }
      }
      btn.disabled = false;
    }

    function fmtRest(sec) {
      if (sec >= 60) return `${Math.floor(sec/60)} min${sec%60 ? ' '+sec%60+'s' : ''}`;
      return `${sec} sec`;
    }

    function svgExercise() {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`;
    }

    // ── Lightbox ──────────────────────────────────────────
    let lightboxImages = [];
    let lightboxIdx    = 0;

    window.openLightbox = function(images, startIdx = 0) {
      lightboxImages = Array.isArray(images) ? images : [images];
      lightboxIdx    = startIdx;
      showLightboxImg();
      document.getElementById('lightbox').classList.add('is-open');
      document.body.style.overflow = 'hidden';
      const hasMulti = lightboxImages.length > 1;
      document.getElementById('lightboxPrev').style.display = hasMulti ? '' : 'none';
      document.getElementById('lightboxNext').style.display = hasMulti ? '' : 'none';
    };

    function showLightboxImg() {
      document.getElementById('lightboxImg').src = lightboxImages[lightboxIdx];
      const counter = document.getElementById('lightboxCounter');
      if (lightboxImages.length > 1) {
        counter.textContent = `${lightboxIdx + 1} / ${lightboxImages.length}`;
        counter.style.display = '';
      } else { counter.style.display = 'none'; }
    }

    function closeLightbox() {
      document.getElementById('lightbox').classList.remove('is-open');
      document.body.style.overflow = '';
      lightboxImages = [];
    }

    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    document.getElementById('lightbox').addEventListener('click', e => { if (e.target === document.getElementById('lightbox')) closeLightbox(); });
    document.getElementById('lightboxPrev').addEventListener('click', () => { lightboxIdx = (lightboxIdx - 1 + lightboxImages.length) % lightboxImages.length; showLightboxImg(); });
    document.getElementById('lightboxNext').addEventListener('click', () => { lightboxIdx = (lightboxIdx + 1) % lightboxImages.length; showLightboxImg(); });

    // ══════════════════════════════════════════════════════
    // TOUR DE BIENVENUE
    // ══════════════════════════════════════════════════════
    const TOUR_KEY = 'neurodisk_tour_v1';

    const TOUR_STEPS = [
      {
        target: '.nav',
        title: 'Votre espace personnel',
        text: 'En haut de chaque page : le logo Neurodisk et le bouton de déconnexion pour quitter en toute sécurité.',
        position: 'bottom',
      },
      {
        target: '.tabs',
        title: 'Deux sections principales',
        text: '« Ma bibliothèque » regroupe vos vidéos et documents. « Mon programme » contient vos exercices prescrits par votre professionnel.',
        position: 'bottom',
      },
      {
        target: '#tab-bibliotheque .categories-grid',
        title: 'Vos catégories de ressources',
        text: 'Chaque carte représente une catégorie. Appuyez sur une carte pour accéder aux ressources correspondantes sélectionnées par votre équipe.',
        position: 'top',
      },
      {
        target: '[data-tab="programme"]',
        title: 'Mon programme d\'exercices',
        text: 'Appuyez ici pour voir vos exercices. Cliquez sur une carte d\'exercice pour voir la démonstration et les instructions détaillées.',
        position: 'bottom',
      },
      {
        target: '#btnSignout',
        title: 'Déconnexion',
        text: 'Utilisez ce bouton pour vous déconnecter à la fin de chaque session. Votre progression est sauvegardée automatiquement.',
        position: 'bottom',
      },
    ];

    let tourStepIdx  = 0;
    let tourActiveEl = null;

    function initTour() {
      if (localStorage.getItem(TOUR_KEY)) return;
      setTimeout(() => {
        const welcome = document.getElementById('tourWelcome');
        welcome.style.display = 'flex';
        welcome.setAttribute('aria-hidden', 'false');
      }, 900);
    }

    function showTourStep() {
      const step  = TOUR_STEPS[tourStepIdx];
      const isLast = tourStepIdx === TOUR_STEPS.length - 1;

      // Retirer l'ancien highlight
      if (tourActiveEl) {
        tourActiveEl.classList.remove('tour-hl');
        tourActiveEl = null;
      }

      // Textes
      document.getElementById('tourStep').textContent  = `Étape ${tourStepIdx + 1} sur ${TOUR_STEPS.length}`;
      document.getElementById('tourTitle').textContent = step.title;
      document.getElementById('tourText').textContent  = step.text;
      document.getElementById('tourBtnNext').textContent = isLast ? 'Terminer ✓' : 'Suivant →';
      document.getElementById('tourBtnPrev').style.display = tourStepIdx > 0 ? '' : 'none';

      // Points de progression
      document.getElementById('tourDots').innerHTML = TOUR_STEPS
        .map((_, i) => `<div class="tour-dot${i === tourStepIdx ? ' is-active' : ''}"></div>`)
        .join('');

      // Afficher overlay + tooltip
      document.getElementById('tourOverlay').style.display = 'block';
      const tip = document.getElementById('tourTip');
      tip.style.display = 'block';

      // Highlight + positionnement
      const el = step.target ? document.querySelector(step.target) : null;
      if (el) {
        tourActiveEl = el;
        el.classList.add('tour-hl');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // Léger délai pour laisser le scroll se terminer
        setTimeout(() => positionTip(tip, el, step.position), 120);
      } else {
        // Centré si pas de cible
        tip.style.top = '50%';
        tip.style.left = '50%';
        tip.style.transform = 'translate(-50%, -50%)';
        tip.className = 'tour-tip';
      }
    }

    function positionTip(tip, el, position) {
      const rect   = el.getBoundingClientRect();
      const tipW   = 380;
      const tipH   = tip.offsetHeight || 200;
      const margin = 14;
      const vw     = window.innerWidth;
      const vh     = window.innerHeight;

      tip.style.transform = '';
      tip.className = 'tour-tip';

      // Calcul horizontal : aligner sur la gauche de l'élément, sans déborder
      let left = Math.max(margin, Math.min(rect.left, vw - tipW - margin));

      let top;
      if (position === 'bottom' && rect.bottom + tipH + margin < vh) {
        top = rect.bottom + margin;
        tip.classList.add('arrow-top');
      } else if (position === 'top' && rect.top - tipH - margin > 0) {
        top = rect.top - tipH - margin;
        tip.classList.add('arrow-bottom');
      } else if (rect.bottom + tipH + margin < vh) {
        top = rect.bottom + margin;
        tip.classList.add('arrow-top');
      } else {
        top = rect.top - tipH - margin;
        tip.classList.add('arrow-bottom');
      }

      tip.style.top  = Math.max(margin, top) + 'px';
      tip.style.left = left + 'px';
    }

    function endTour() {
      localStorage.setItem(TOUR_KEY, '1');
      if (tourActiveEl) { tourActiveEl.classList.remove('tour-hl'); tourActiveEl = null; }
      document.getElementById('tourWelcome').style.display  = 'none';
      document.getElementById('tourOverlay').style.display  = 'none';
      document.getElementById('tourTip').style.display      = 'none';
    }

    // Boutons welcome
    document.getElementById('tourBtnStart').addEventListener('click', () => {
      document.getElementById('tourWelcome').style.display = 'none';
      tourStepIdx = 0;
      showTourStep();
    });
    document.getElementById('tourBtnSkipWelcome').addEventListener('click', endTour);

    // Boutons étapes
    document.getElementById('tourBtnSkip').addEventListener('click', endTour);
    document.getElementById('tourBtnNext').addEventListener('click', () => {
      tourStepIdx++;
      if (tourStepIdx >= TOUR_STEPS.length) endTour();
      else showTourStep();
    });
    document.getElementById('tourBtnPrev').addEventListener('click', () => {
      if (tourStepIdx > 0) { tourStepIdx--; showTourStep(); }
    });

    // Échap pour ignorer
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.getElementById('tourTip').style.display !== 'none') endTour();
    });

    // ── Carrousel d'images (cartes) ───────────────────────
    window.carouselGoto = function(carousel, idx) {
      const imgs = carousel.querySelectorAll('.carousel__img');
      const dots = carousel.querySelectorAll('.carousel__dot');
      const total = imgs.length;
      idx = ((idx % total) + total) % total;
      imgs.forEach((img, i) => img.classList.toggle('is-active', i === idx));
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === idx));
      carousel.dataset.idx = idx;
    };
    window.carouselPrev = btn => { const c = btn.closest('.carousel'); carouselGoto(c, parseInt(c.dataset.idx) - 1); };
    window.carouselNext = btn => { const c = btn.closest('.carousel'); carouselGoto(c, parseInt(c.dataset.idx) + 1); };
    function initCarousel(carousel) {
      carousel.querySelectorAll('.carousel__btn, .carousel__dot').forEach(el => {
        el.addEventListener('click', e => e.stopPropagation());
      });
    }

    // ── Calendrier de progression 30 jours ───────────────
    async function renderProgressCalendar() {
      const calEl = document.getElementById('progressCalendar');
      const grid  = document.getElementById('calendarGrid');
      if (!calEl || !grid) return;

      try {
        // S'assurer d'avoir le userId (au cas où le .then() n'a pas encore résolu)
        if (!currentUserId) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) currentUserId = session.user.id;
          else return;
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        // Tous les exercices assignés au patient (tous programmes)
        const progIds = allProgrammes.map(p => p.id);
        const { data: allPE } = progIds.length
          ? await supabase.from('patient_exercises').select('exercise_id').in('programme_id', progIds)
          : { data: [] };

        const totalExercises = new Set((allPE || []).map(pe => pe.exercise_id)).size;

        // Logs des 30 derniers jours
        const { data: logs } = await supabase
          .from('exercise_logs')
          .select('exercise_id, completed_at')
          .eq('patient_id', currentUserId)
          .gte('completed_at', thirtyDaysAgo.toISOString());

        // Grouper par jour : nb d'exercices distincts complétés
        const byDay = {};
        (logs || []).forEach(l => {
          const day = l.completed_at.slice(0, 10);
          if (!byDay[day]) byDay[day] = new Set();
          byDay[day].add(l.exercise_id);
        });

        // Construire les 30 carreaux
        const days = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          days.push(d);
        }

        grid.innerHTML = days.map(d => {
          const key   = d.toISOString().slice(0, 10);
          const done  = byDay[key] ? byDay[key].size : 0;
          const level = done === 0 ? 0 : done >= totalExercises ? 2 : 1;
          const label = d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
          const tip   = done === 0
            ? `${label} — aucun`
            : `${label} — ${done}/${totalExercises} exercice${done > 1 ? 's' : ''}`;
          return `<div class="prog-calendar__day" data-level="${level}" data-tooltip="${tip}"></div>`;
        }).join('');

        calEl.style.display = '';
      } catch(e) {
        console.error('[calendar]', e);
      }
    }

