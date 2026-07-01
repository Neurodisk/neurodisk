    import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
    import { PROM_DEFS, PROM_LIST, renderPromForm, collectProm, renderPromChart } from '/js/proms.js?v=1';
    import { NEURODISK_CORE, checkRedFlags, deriveDirectionalPattern, directionalPatternLabel } from '/js/assessments.js?v=3';

    const SUPABASE_URL      = 'https://jqxykxkikvrgwnajhhbi.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_t1EUH4wn9vtNBC7pUNbKOA_OhFfWsEi';
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
    let currentView = 'patient'; // 'patient' | 'professional'
    let _userId = null;
    let _isAdmin = false;
    const loader = document.getElementById('pageLoader');

    // ── Hors-ligne : cache local + bandeau ──────────────────
    const Cache = {
      set(k, v) { try { localStorage.setItem('nd_' + k, JSON.stringify(v)); } catch {} },
      get(k)    { try { return JSON.parse(localStorage.getItem('nd_' + k)); } catch { return null; } },
    };
    // Lit la session Supabase stockée localement (même expirée) → l'utilisateur
    // s'est déjà connecté sur cet appareil. Sert de filet hors-ligne.
    function storedSupabaseUser() {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
            const v = JSON.parse(localStorage.getItem(k) || 'null');
            const u = v?.user || v?.currentSession?.user;
            if (u?.id) return u.id;
          }
        }
      } catch {}
      return null;
    }
    function setOfflineBanner(on) {
      let b = document.getElementById('offlineBanner');
      if (on) {
        if (!b) {
          b = document.createElement('div');
          b.id = 'offlineBanner';
          b.style.cssText = 'background:#fff8e8;border:1px solid #f0d98a;color:#7c5b00;padding:.65rem 1rem;border-radius:10px;margin:0 0 1.25rem;font-size:.95rem;text-align:center;font-weight:500';
          b.textContent = '📴 Mode hors-ligne — consignes et images disponibles. Vidéos indisponibles sans Internet.';
          const main = document.querySelector('.main');
          if (main) main.prepend(b);
        }
      } else if (b) { b.remove(); }
    }
    window.addEventListener('online',  () => setOfflineBanner(false));
    window.addEventListener('offline', () => setOfflineBanner(true));

    async function loadCategories() {
      const audience = currentView === 'professional' ? 'professional' : 'patient';
      let data = null;
      try {
        const res = await supabase
          .from('resource_categories')
          .select('*')
          .eq('audience', audience)
          .order('sort_order');
        if (res.error) throw res.error;
        data = res.data;
      } catch {}
      if (data && data.length) {
        allCategories = data;
        if (audience === 'patient') Cache.set('categories', data);
      } else {
        allCategories = (audience === 'patient' ? Cache.get('categories') : null) || data || [];
        if (!navigator.onLine) setOfflineBanner(true);
      }
      renderTiles();
    }

    // ── Icônes au trait des catégories (cohérent avec l'admin) ──
    const CATEGORY_ICON_PATHS = {
      folder:    '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
      target:    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
      clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>',
      activity:  '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
      film:      '<rect x="2" y="2" width="20" height="20" rx="2.5"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>',
      video:     '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
      play:      '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
      leaf:      '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
      heart:     '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
      book:      '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
      star:      '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
      award:     '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
      calendar:  '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
      check:     '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    };
    const EMOJI_TO_ICON = {
      '📁':'folder','📂':'folder','🗂️':'folder','🗂':'folder','🎯':'target','🥅':'target',
      '📋':'clipboard','📝':'clipboard','🗒️':'clipboard','🗒':'clipboard',
      '💪':'activity','🏃':'activity','🏃‍♂️':'activity','🤸':'activity','🏋️':'activity',
      '🎬':'film','📹':'video','🎥':'video','▶️':'play','⏯️':'play',
      '🌱':'leaf','🌿':'leaf','🍃':'leaf','❤️':'heart','💙':'heart','💗':'heart','🫀':'heart',
      '📚':'book','📖':'book','📕':'book','⭐':'star','🌟':'star',
      '🏆':'award','🥇':'award','🏅':'award','📅':'calendar','🗓️':'calendar','🗓':'calendar',
      '✅':'check','☑️':'check','✔️':'check',
    };
    function catIconSvg(value, size = 40) {
      const name = CATEGORY_ICON_PATHS[value] ? value : (EMOJI_TO_ICON[value] || 'folder');
      return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CATEGORY_ICON_PATHS[name]}</svg>`;
    }

    function renderTiles() {
      const nav = document.getElementById('heroNav');
      if (!nav) return;
      const catTabs = allCategories.map(cat => `
        <button class="hero-nav__tab" data-section="${esc(cat.id)}">
          <span class="hero-nav__tab__icon">${catIconSvg(cat.icon)}</span>
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
      let session = null;
      try { ({ data: { session } } = await supabase.auth.getSession()); } catch {}
      if (!session) {
        // Hors-ligne : rester dans l'app si l'utilisateur s'est déjà connecté ici
        const uid = Cache.get('uid') || storedSupabaseUser();
        if (!navigator.onLine && uid) {
          loader.classList.add('is-hidden');
          setTimeout(() => loader.remove(), 350);
          setOfflineBanner(true);
          _userId = uid;
          Cache.set('uid', uid);
          await loadCategories();
          loadProgramme();
          return;
        }
        window.location.replace('/');
        return;
      }
      Cache.set('uid', session.user.id);

      loader.classList.add('is-hidden');
      setTimeout(() => loader.remove(), 350);

      const user = session.user;
      setGreeting(user);
      initTour();

      const { data: profile } = await supabase.from('profiles').select('is_admin, is_professional, full_name').eq('id', user.id).single();
      const isAdmin = profile?.is_admin === true;
      const isPro   = profile?.is_professional === true;
      _userId  = user.id;
      _isAdmin = isAdmin;

      if (isAdmin && !isPro) document.getElementById('btnAdmin').style.display = 'flex';
      if (isPro) {
        document.getElementById('btnProfessionnel').style.display = 'flex';
        // Afficher le toggle de vue
        const toggle = document.getElementById('viewToggle');
        if (toggle) toggle.style.display = 'flex';
        document.getElementById('btnViewPatient').addEventListener('click', () => switchView('patient'));
        document.getElementById('btnViewPro').addEventListener('click',     () => switchView('professional'));
        updateToggleUI();
        loadProSurveys(user.id);
      }

      await Promise.all([loadCategories(), loadResources(user.id, isAdmin), loadPatientForms(user.id, isAdmin), loadNextAppointment(user.id), loadProms(user.id), loadAssessments(user.id)]);

      if (isAdmin || isPro) {
        _chatBindEvents();
        initLibraryChat(user.id, profile.full_name || user.email);
      }
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

    function updateToggleUI() {
      const btnP = document.getElementById('btnViewPatient');
      const btnR = document.getElementById('btnViewPro');
      if (!btnP || !btnR) return;
      btnP.className = currentView === 'patient'       ? 'nav-btn nav-btn--primary' : 'nav-btn nav-btn--ghost';
      btnR.className = currentView === 'professional'  ? 'nav-btn nav-btn--primary' : 'nav-btn nav-btn--ghost';
    }

    async function switchView(view) {
      if (currentView === view) return;
      currentView = view;
      updateToggleUI();
      await Promise.all([loadCategories(), loadResources(_userId, _isAdmin)]);
    }

    // ── SONDAGES (professionnel) ──────────────────────────
    let _proSurveyState = null;

    async function loadProSurveys(userId) {
      const wrap = document.getElementById('proSurveysWrap');
      if (!wrap) return;
      const { data: assigns } = await supabase.from('survey_assignments')
        .select('survey_id, survey:surveys(id,title,description)')
        .eq('professional_id', userId);
      if (!assigns || !assigns.length) { wrap.style.display = 'none'; return; }
      const surveyIds = assigns.map(a => a.survey_id);
      const { data: resps } = await supabase.from('survey_responses')
        .select('survey_id').eq('professional_id', userId).in('survey_id', surveyIds);
      const done = new Set((resps || []).map(r => r.survey_id));

      // On n'affiche que les sondages PAS encore remplis :
      // une fois répondu, le sondage disparaît au rechargement.
      const pending = assigns.filter(a => a.survey && !done.has(a.survey.id));
      if (!pending.length) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }

      const items = pending.map(a => {
        const s = a.survey;
        return `<div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;background:#fff;border:1px solid #dbe4f0;border-radius:12px;padding:.85rem 1rem;margin-bottom:.5rem">
          <div><strong>📋 ${esc(s.title)}</strong>${s.description?`<br><small style="color:#667">${esc(s.description)}</small>`:''}</div>
          <button class="nav-btn nav-btn--primary" style="white-space:nowrap" onclick="openSurvey('${s.id}')">Répondre</button>
        </div>`;
      }).join('');
      wrap.innerHTML = `<div style="font-weight:700;color:#1B2B6B;margin-bottom:.5rem">Sondages à remplir</div>${items}`;
      wrap.style.display = 'block';
    }

    window.openSurvey = async (surveyId) => {
      const { data: survey } = await supabase.from('surveys').select('title,description').eq('id', surveyId).single();
      const { data: questions } = await supabase.from('survey_questions').select('*').eq('survey_id', surveyId).order('sort_order');
      _proSurveyState = { surveyId, questions: questions || [] };
      document.getElementById('surveyModalTitle').textContent = survey?.title || 'Sondage';
      document.getElementById('surveyModalDesc').textContent  = survey?.description || '';
      document.getElementById('surveyModalMsg').textContent   = '';
      document.getElementById('surveyModalQuestions').innerHTML = (questions || []).map(q => {
        const base = `<div style="margin-bottom:1rem"><label style="display:block;font-weight:600;font-size:.9rem;margin-bottom:.4rem">${esc(q.label)}</label>`;
        if (q.qtype === 'scale') {
          return base + `<div style="display:flex;gap:.4rem">${[1,2,3,4,5].map(n=>`<label style="flex:1;text-align:center;border:1px solid #ccc;border-radius:8px;padding:.5rem;cursor:pointer"><input type="radio" name="sq_${q.id}" value="${n}" style="display:block;margin:0 auto .2rem">${n}</label>`).join('')}</div></div>`;
        } else if (q.qtype === 'choice') {
          const opts = Array.isArray(q.options) ? q.options : [];
          return base + opts.map(o=>`<label style="display:flex;align-items:center;gap:.5rem;margin:.25rem 0;font-size:.88rem"><input type="radio" name="sq_${q.id}" value="${esc(o)}">${esc(o)}</label>`).join('') + `</div>`;
        }
        return base + `<textarea name="sq_${q.id}" rows="2" style="width:100%;padding:.5rem;border:1px solid #ccc;border-radius:8px"></textarea></div>`;
      }).join('');
      document.getElementById('surveyModal').style.display = 'flex';
    };

    document.getElementById('btnSurveyCancel')?.addEventListener('click', () => {
      document.getElementById('surveyModal').style.display = 'none';
    });

    document.getElementById('btnSurveySubmit')?.addEventListener('click', async () => {
      if (!_proSurveyState) return;
      const { surveyId, questions } = _proSurveyState;
      const answers = {};
      for (const q of questions) {
        if (q.qtype === 'text') {
          answers[q.id] = (document.querySelector(`textarea[name="sq_${q.id}"]`)?.value || '').trim();
        } else {
          const checked = document.querySelector(`input[name="sq_${q.id}"]:checked`);
          answers[q.id] = checked ? checked.value : '';
        }
      }
      const btn = document.getElementById('btnSurveySubmit');
      btn.disabled = true; btn.textContent = 'Envoi…';
      const { data:{ user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('survey_responses')
        .insert({ survey_id: surveyId, professional_id: user.id, answers });
      btn.disabled = false; btn.textContent = 'Envoyer mes réponses';
      if (error) { document.getElementById('surveyModalMsg').textContent = 'Erreur : ' + error.message; return; }
      document.getElementById('surveyModal').style.display = 'none';
      toast('Merci, vos réponses ont été envoyées.', 'success');
      loadProSurveys(user.id);
    });

    // ── OBJECTIFS (patient) ───────────────────────────────
    const objLocalDate = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const objRecurLabel = (n) => !n ? '' : (n === 1 ? 'Chaque jour' : n === 7 ? 'Chaque semaine' : 'Aux ' + n + ' jours');

    async function loadObjectives() {
      const wrap = document.getElementById('objectifsContent');
      if (!wrap) return;
      const todayStr = objLocalDate();
      const weekAgoStr = objLocalDate(new Date(Date.now() - 6 * 86400000));
      const [{ data, error }, { data: comps }] = await Promise.all([
        supabase.from('patient_objectives').select('*').eq('patient_id', _userId).order('sort_order').order('created_at'),
        supabase.from('objective_completions').select('objective_id, completed_on').eq('patient_id', _userId).gte('completed_on', weekAgoStr),
      ]);
      if (error) { wrap.innerHTML = `<div class="state-wrap"><p class="state-title">Erreur de chargement</p></div>`; return; }
      const objs = data || [];
      const compByObj = {};
      (comps || []).forEach(c => { (compByObj[c.objective_id] = compByObj[c.objective_id] || []).push(c.completed_on); });
      const doneToday = (o) => o.recur_interval_days ? (compByObj[o.id] || []).includes(todayStr) : o.is_done;
      const weekCount = (o) => (compByObj[o.id] || []).length;
      if (!objs.length) {
        wrap.innerHTML = `<div class="state-wrap"><div class="state-icon" style="font-size:2.5rem">🎯</div><p class="state-title">Vos objectifs arrivent bientôt</p><p class="state-text">Votre professionnel n'a pas encore défini d'objectifs. Ils apparaîtront ici pour vous accompagner vers votre rétablissement.</p></div>`;
        return;
      }
      const total = objs.length, done = objs.filter(doneToday).length;
      const pct = Math.round(done / total * 100);
      const groups = {
        court: { icon:'🎯', title:'Court terme', color:'#0d9488', bg:'#ecfdf5' },
        moyen: { icon:'📈', title:'Moyen terme', color:'#2563EB', bg:'#eff6ff' },
        long:  { icon:'🏆', title:'Long terme',  color:'#b45309', bg:'#fffbeb' },
      };
      const encourage = (p) =>
        p === 0   ? "On commence ? Chaque petit pas compte. 💪" :
        p === 100 ? "Incroyable — tous vos objectifs sont atteints ! 🎉" :
        p >= 67   ? "Vous y êtes presque, gardez le cap ! 🔥" :
        p >= 34   ? "Belle progression, continuez sur cette lancée ! 👏" :
                    "Bravo, vous avez fait le premier pas ! 🌱";

      // Anneau de progression circulaire
      const R = 34, C = 2 * Math.PI * R, off = C * (1 - pct / 100);
      const ring = `
        <svg width="86" height="86" viewBox="0 0 84 84" style="flex-shrink:0">
          <circle cx="42" cy="42" r="${R}" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="8"/>
          <circle cx="42" cy="42" r="${R}" fill="none" stroke="#34d399" stroke-width="8" stroke-linecap="round"
            stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 42 42)"
            style="transition:stroke-dashoffset .7s ease"/>
          <text x="42" y="48" text-anchor="middle" fill="#fff" font-size="19" font-weight="700">${pct}%</text>
        </svg>`;

      let html = `
        <div style="background:linear-gradient(135deg,#1B2B6B,#2563eb);color:#fff;border-radius:18px;padding:1.3rem 1.5rem;margin-bottom:1.6rem;display:flex;align-items:center;gap:1.2rem">
          ${ring}
          <div style="flex:1">
            <div style="font-size:1.15rem;font-weight:700;margin-bottom:.15rem">Votre progression</div>
            <div style="font-size:.9rem;opacity:.95;margin-bottom:.1rem">${done} objectif${done>1?'s':''} atteint${done>1?'s':''} sur ${total}</div>
            <div style="font-size:.92rem;font-weight:600;color:#a7f3d0">${encourage(pct)}</div>
          </div>
        </div>`;

      for (const h of ['court','moyen','long']) {
        const list = objs.filter(o => o.horizon === h);
        if (!list.length) continue;
        const g = groups[h];
        const hDone = list.filter(doneToday).length;
        html += `<div style="margin-bottom:1.5rem">
          <div style="display:flex;align-items:center;gap:.5rem;margin:0 0 .7rem">
            <span style="font-size:1.2rem">${g.icon}</span>
            <h2 style="font-size:1.05rem;color:${g.color};margin:0;font-weight:700">${g.title}</h2>
            <span style="margin-left:auto;font-size:.78rem;font-weight:600;color:${g.color};background:${g.bg};border-radius:100px;padding:.15rem .6rem">${hDone}/${list.length}</span>
          </div>`;
        html += list.map(o => {
          const rec = o.recur_interval_days;
          const d = doneToday(o);
          if (rec) {
            const wc = weekCount(o);
            return `<label style="display:flex;align-items:flex-start;gap:.8rem;background:${d?'#f0fdf4':'#fff'};border:1px solid ${d?'#bbf7d0':'#dbe4f0'};border-left:4px solid ${d?'#16a34a':g.color};border-radius:12px;padding:.9rem 1rem;margin-bottom:.55rem;cursor:pointer;transition:background .2s">
              <input type="checkbox" ${d?'checked':''} onchange="toggleObjectiveDay('${o.id}', this.checked)" style="width:22px;height:22px;margin-top:.05rem;flex-shrink:0;cursor:pointer;accent-color:#16a34a">
              <span style="flex:1">
                <span style="color:#1e293b;font-weight:600;font-size:1rem">${esc(o.label)}</span>
                <span style="background:#e6f1fb;color:#2468D6;font-size:.72rem;font-weight:700;padding:.1rem .45rem;border-radius:6px;margin-left:.4rem;white-space:nowrap">🔁 ${objRecurLabel(rec)}</span>
                <br><small style="color:${d?'#16a34a':'#64748b'};font-weight:${d?'700':'400'}">${d ? '✓ Fait aujourd\'hui !' : 'À faire aujourd\'hui'}${wc ? ` · ✓ ${wc} fois ces 7 jours` : ''}</small>
              </span>
            </label>`;
          }
          return `<label style="display:flex;align-items:flex-start;gap:.8rem;background:${d?'#f0fdf4':'#fff'};border:1px solid ${d?'#bbf7d0':'#dbe4f0'};border-left:4px solid ${d?'#16a34a':g.color};border-radius:12px;padding:.9rem 1rem;margin-bottom:.55rem;cursor:pointer;transition:background .2s">
            <input type="checkbox" ${d?'checked':''} onchange="toggleObjective('${o.id}', this.checked)" style="width:22px;height:22px;margin-top:.05rem;flex-shrink:0;cursor:pointer;accent-color:#16a34a">
            <span style="flex:1">
              <span style="${d?'text-decoration:line-through;color:#94a3b8':'color:#1e293b'};font-weight:600;font-size:1rem">${esc(o.label)}</span>
              ${d ? '<span style="color:#16a34a;font-weight:600;font-size:.82rem;margin-left:.4rem">✓ atteint</span>' : ''}
              ${o.target_date?`<br><small style="color:#64748b">📅 Objectif pour le ${new Date(o.target_date+'T00:00').toLocaleDateString('fr-CA',{day:'numeric',month:'long',year:'numeric'})}</small>`:''}
            </span>
          </label>`;
        }).join('');
        html += `</div>`;
      }
      wrap.innerHTML = html;
    }

    window.toggleObjective = async (id, done) => {
      const { error } = await supabase.from('patient_objectives')
        .update({ is_done: done, done_at: done ? new Date().toISOString() : null }).eq('id', id);
      if (error) { toast('Erreur, réessayez.', 'error'); return; }
      loadObjectives();
    };

    // Objectif récurrent : marquer / démarquer « fait aujourd'hui »
    window.toggleObjectiveDay = async (id, done) => {
      const todayStr = objLocalDate();
      if (done) {
        const { error } = await supabase.from('objective_completions')
          .insert({ objective_id: id, patient_id: _userId, completed_on: todayStr });
        if (error && !/duplicate|unique/i.test(error.message || '')) { toast('Erreur, réessayez.', 'error'); return; }
      } else {
        await supabase.from('objective_completions').delete().eq('objective_id', id).eq('completed_on', todayStr);
      }
      loadObjectives();
    };

    // ── ÉDUCATION (capsules PNE) ──────────────────────────
    async function loadEducation() {
      const wrap = document.getElementById('educationContent');
      if (!wrap) return;
      const [{ data: caps }, { data: views }] = await Promise.all([
        supabase.from('capsules').select('*').order('sort_order'),
        supabase.from('capsule_views').select('capsule_id').eq('patient_id', _userId),
      ]);
      const list = caps || [];
      if (!list.length) {
        wrap.innerHTML = `<div class="state-wrap"><div class="state-icon" style="font-size:2.5rem">📘</div><p class="state-title">Bientôt disponible</p><p class="state-text">Votre équipe prépare votre parcours « Comprendre ma douleur ».</p></div>`;
        return;
      }
      const seen = new Set((views || []).map(v => v.capsule_id));
      const done = list.filter(c => seen.has(c.id)).length;
      const pct = Math.round(done / list.length * 100);

      let html = `
        <div style="background:linear-gradient(135deg,#1B2B6B,#2563eb);color:#fff;border-radius:16px;padding:1.25rem 1.5rem;margin-bottom:1.5rem">
          <div style="font-size:1.05rem;font-weight:700;margin-bottom:.2rem">Comprendre ma douleur</div>
          <div style="font-size:.85rem;opacity:.92;margin-bottom:.6rem">${done} capsule${done > 1 ? 's' : ''} sur ${list.length}${pct === 100 ? ' — parcours terminé ! 🎉' : ''}</div>
          <div style="background:rgba(255,255,255,.25);border-radius:100px;height:12px;overflow:hidden"><div style="width:${pct}%;height:100%;background:#34d399;border-radius:100px;transition:width .5s"></div></div>
        </div>`;

      html += list.map(c => {
        const yt = ytId(c.video_url);
        const viewed = seen.has(c.id);
        const media = yt ? `<div style="margin:.6rem 0"><iframe src="https://www.youtube-nocookie.com/embed/${yt}?rel=0" allowfullscreen allow="autoplay" style="width:100%;aspect-ratio:16/9;border:none;border-radius:10px"></iframe></div>` : '';
        return `<div style="background:#fff;border:1px solid #dbe4f0;border-radius:12px;padding:1rem 1.1rem;margin-bottom:.7rem">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem">
            <h2 style="font-size:1.02rem;color:#1B2B6B;margin:0">${esc(c.title)}</h2>
            <label style="display:flex;align-items:center;gap:.4rem;font-size:.85rem;white-space:nowrap;cursor:pointer;color:${viewed ? '#1e8a4c' : '#667'}">
              <input type="checkbox" ${viewed ? 'checked' : ''} onchange="toggleCapsule('${c.id}', this.checked)" style="width:18px;height:18px;cursor:pointer"> Vu
            </label>
          </div>
          ${media}
          ${c.body ? `<p style="margin:.5rem 0 0;line-height:1.6;color:#1e293b">${esc(c.body)}</p>` : ''}
        </div>`;
      }).join('');
      wrap.innerHTML = html;
    }

    window.toggleCapsule = async (id, viewed) => {
      if (viewed) await supabase.from('capsule_views').insert({ patient_id: _userId, capsule_id: id });
      else await supabase.from('capsule_views').delete().eq('patient_id', _userId).eq('capsule_id', id);
      loadEducation();
    };

    // ── PROMs (questionnaires de suivi du patient) ────────
    let _promCurrent = null, _promAssigns = {}, _promResps = {};

    async function loadProms(userId) {
      const wrap = document.getElementById('promWrap');
      if (!wrap) return;
      const [{ data: assigns }, { data: resps }] = await Promise.all([
        supabase.from('prom_assignments').select('instrument, activities').eq('patient_id', userId),
        supabase.from('prom_responses').select('instrument,score,completed_at').eq('patient_id', userId).order('completed_at'),
      ]);
      if (!assigns || !assigns.length) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
      _promAssigns = {}; assigns.forEach(a => { _promAssigns[a.instrument] = a; });
      _promResps = {}; (resps || []).forEach(r => { (_promResps[r.instrument] = _promResps[r.instrument] || []).push(r); });

      const items = assigns.map(a => {
        const d = PROM_DEFS[a.instrument];
        const rows = _promResps[a.instrument] || [];
        const last = rows.length ? rows[rows.length - 1] : null;
        const chart = rows.length ? renderPromChart(a.instrument, rows) : '';
        return `<div style="background:#fff;border:1px solid #dbe4f0;border-radius:12px;padding:.9rem 1rem;margin-bottom:.6rem">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap">
            <div><strong>${esc(d.name)}</strong>${last ? `<br><small style="color:#667">Dernier score : ${last.score} ${d.unit} — ${new Date(last.completed_at).toLocaleDateString('fr-CA')}</small>` : '<br><small style="color:#667">À remplir</small>'}</div>
            <button class="nav-btn nav-btn--primary" style="white-space:nowrap" onclick="openProm('${a.instrument}')">Remplir</button>
          </div>
          ${chart}
        </div>`;
      }).join('');
      wrap.innerHTML = `<div style="font-weight:700;color:#1B2B6B;margin-bottom:.5rem">Mes questionnaires de suivi</div>${items}`;
      wrap.style.display = 'block';
    }

    window.openProm = (code) => {
      _promCurrent = code;
      const d = PROM_DEFS[code];
      document.getElementById('promModalTitle').textContent = d.name;
      document.getElementById('promModalMsg').textContent = '';
      const body = document.getElementById('promModalBody');
      let prefill = {};
      if (code === 'psfs') {
        const a = _promAssigns[code];
        if (a && a.activities && a.activities.length) prefill.activities = a.activities.map(x => ({ name: x.name || x, score: '' }));
      }
      renderPromForm(code, body, prefill);
      document.getElementById('promModal').style.display = 'flex';
    };

    document.getElementById('btnPromCancel')?.addEventListener('click', () => {
      document.getElementById('promModal').style.display = 'none';
    });

    document.getElementById('btnPromSubmit')?.addEventListener('click', async () => {
      if (!_promCurrent) return;
      const body = document.getElementById('promModalBody');
      const res = collectProm(_promCurrent, body);
      if (res.error) { document.getElementById('promModalMsg').textContent = res.error; return; }
      const btn = document.getElementById('btnPromSubmit'); btn.disabled = true; btn.textContent = 'Envoi…';
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('prom_responses').insert({
        patient_id: user.id, instrument: _promCurrent, answers: res.answers, score: res.score, score_max: res.max,
      });
      if (!error && _promCurrent === 'psfs' && res.answers.activities) {
        await supabase.from('prom_assignments').update({ activities: res.answers.activities.map(a => ({ name: a.name })) })
          .eq('patient_id', user.id).eq('instrument', 'psfs');
      }
      btn.disabled = false; btn.textContent = 'Envoyer';
      if (error) { document.getElementById('promModalMsg').textContent = 'Erreur : ' + error.message; return; }
      document.getElementById('promModal').style.display = 'none';
      toast('Merci, votre questionnaire est enregistré.', 'success');
      loadProms(user.id);
    });

    // ── Bilan Neurodisk (assessments) ──────────────────────
    let _assessType = null;   // 'initial' | 'suivi'
    let _assessStep = 'gate'; // 'gate' | 'form'
    let _assessGateAnswers = {};

    async function loadAssessments(userId) {
      const wrap = document.getElementById('assessWrap');
      if (!wrap) return;
      const { data: rows } = await supabase.from('assessments')
        .select('id, type, completed_at').eq('patient_id', userId).order('completed_at', { ascending: false });
      const hasInitial = (rows || []).some(r => r.type === 'initial');
      const last = rows && rows[0];

      wrap.innerHTML = `
        <div style="background:#fff;border:1px solid #dbe4f0;border-radius:12px;padding:.9rem 1rem;margin-bottom:.6rem">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap">
            <div>
              <strong>Bilan Neurodisk</strong>
              <br><small style="color:#667">${last ? 'Dernier bilan : ' + new Date(last.completed_at).toLocaleDateString('fr-CA') : 'Aucun bilan complété'}</small>
            </div>
            <button class="nav-btn nav-btn--primary" style="white-space:nowrap" onclick="openAssessment('${hasInitial ? 'suivi' : 'initial'}')">
              ${hasInitial ? 'Faire une réévaluation' : 'Remplir mon bilan initial'}
            </button>
          </div>
        </div>`;
      wrap.style.display = 'block';
    }

    window.openAssessment = (type) => {
      _assessType = type; _assessStep = 'gate'; _assessGateAnswers = {};
      document.getElementById('assessModalTitle').textContent = type === 'initial' ? 'Bilan initial — dépistage de sécurité' : 'Réévaluation — dépistage de sécurité';
      document.getElementById('assessModalMsg').textContent = '';
      renderGateStep();
      document.getElementById('btnAssessSubmit').textContent = 'Continuer';
      document.getElementById('assessModal').style.display = 'flex';
    };

    function renderGateStep() {
      const body = document.getElementById('assessModalBody');
      body.innerHTML = `
        <p style="font-size:.95rem;color:#475569;margin:0 0 1rem">Avant de continuer, répondez à ces quelques questions de sécurité.</p>
        ${NEURODISK_CORE.redFlags.map(f => `
          <label class="assess-check-row">
            <input type="checkbox" class="assess-check" data-key="${f.key}">${esc(f.label)}
          </label>`).join('')}`;
    }

    function renderMainForm() {
      const N = NEURODISK_CORE;
      const body = document.getElementById('assessModalBody');
      const evaSlider = (it) => `
        <div class="assess-eva-label"><span>${esc(it.label)}</span><span class="assess-eva-value" id="val_${it.key}">0</span></div>
        <input type="range" min="${it.min}" max="${it.max}" value="0" class="assess-eva-slider" data-key="${it.key}"
          oninput="document.getElementById('val_${it.key}').textContent=this.value">`;
      const triggerFieldset = (it, i) => `
        <fieldset class="assess-item"><legend>${esc(it.label)}</legend>
          ${it.scale
            ? it.scale.map((s, v) => `<label class="assess-radio"><input type="radio" name="${it.key}" value="${v}">${esc(s)}</label>`).join('')
            : N.triggerScale.map(s => `<label class="assess-radio"><input type="radio" name="${it.key}" value="${s.value}">${esc(s.label)}</label>`).join('')}
        </fieldset>`;

      body.innerHTML = `
        <div class="assess-section-title">Douleur</div>
        ${N.pain.map(evaSlider).join('')}

        <div class="assess-section-title">Localisation et irradiation</div>
        ${N.location.map(it => it.type === 'check'
          ? `<label class="assess-check-row"><input type="checkbox" class="assess-check" data-key="${it.key}">${esc(it.label)}</label>`
          : `<div style="margin-bottom:.6rem"><label style="font-size:.9rem">${esc(it.label)}</label><input type="text" class="assess-text-input assess-text" data-key="${it.key}"></div>`
        ).join('')}

        <div class="assess-section-title">Déclencheurs et provocations</div>
        ${Object.values(N.triggers).map(g => `
          <div class="assess-trigger-group">
            <div class="assess-trigger-group__title">${esc(g.title)}</div>
            ${g.items.map(triggerFieldset).join('')}
          </div>`).join('')}

        <div class="assess-section-title">Marche</div>
        <div style="margin-bottom:.6rem"><label style="font-size:.9rem">${esc(N.walkingAndPattern[0].label)}</label>
          <input type="number" min="0" class="assess-text-input assess-num" data-key="walk_minutes"></div>
        <fieldset class="assess-item"><legend>${esc(N.walkingAndPattern[1].label)}</legend>
          <label class="assess-radio"><input type="radio" name="relief_sit_flex" value="true">Oui</label>
          <label class="assess-radio"><input type="radio" name="relief_sit_flex" value="false">Non</label>
        </fieldset>

        <div class="assess-section-title">Sommeil</div>
        ${N.sleep.map(it => `<div style="margin-bottom:.6rem"><label style="font-size:.9rem">${esc(it.label)}</label><input type="text" class="assess-text-input assess-text" data-key="${it.key}"></div>`).join('')}

        <div class="assess-section-title">Vos activités importantes</div>
        <p style="font-size:.88rem;color:#667;margin:0 0 .6rem">Nommez jusqu'à 3 activités limitées par la douleur et cotez chacune de 0 (aucune difficulté) à 10 (incapable).</p>
        ${[1, 2, 3].map(i => `
          <div style="margin-bottom:.8rem">
            <input type="text" class="assess-text-input assess-text" data-key="act${i}_name" placeholder="Activité ${i}">
            <div class="assess-eva-label" style="margin-top:.4rem"><span>Difficulté</span><span class="assess-eva-value" id="val_act${i}_score">0</span></div>
            <input type="range" min="0" max="10" value="0" class="assess-eva-slider" data-key="act${i}_score"
              oninput="document.getElementById('val_act${i}_score').textContent=this.value">
          </div>`).join('')}

        ${_assessType === 'suivi' ? `
          <div class="assess-section-title">${esc(N.pgic.label)}</div>
          <fieldset class="assess-item">
            ${N.pgic.options.map(o => `<label class="assess-radio"><input type="radio" name="pgic" value="${esc(o)}">${esc(o)}</label>`).join('')}
          </fieldset>` : ''}`;
    }

    function collectAssessForm(mountEl) {
      const answers = {};
      mountEl.querySelectorAll('.assess-eva-slider').forEach(el => { answers[el.dataset.key] = Number(el.value); });
      mountEl.querySelectorAll('.assess-check').forEach(el => { answers[el.dataset.key] = el.checked; });
      mountEl.querySelectorAll('.assess-text').forEach(el => { if (el.value.trim()) answers[el.dataset.key] = el.value.trim(); });
      mountEl.querySelectorAll('.assess-num').forEach(el => { if (el.value !== '') answers[el.dataset.key] = Number(el.value); });
      const radioNames = new Set([...mountEl.querySelectorAll('input[type=radio]')].map(r => r.name));
      radioNames.forEach(name => {
        const sel = mountEl.querySelector(`input[name="${name}"]:checked`);
        if (sel) answers[name] = sel.value === 'true' ? true : (sel.value === 'false' ? false : (isNaN(Number(sel.value)) || sel.value === '' ? sel.value : Number(sel.value)));
      });
      return answers;
    }

    document.getElementById('btnAssessCancel')?.addEventListener('click', () => {
      document.getElementById('assessModal').style.display = 'none';
    });
    document.getElementById('btnRedFlagOk')?.addEventListener('click', () => {
      document.getElementById('redFlagModal').style.display = 'none';
    });

    document.getElementById('btnAssessSubmit')?.addEventListener('click', async () => {
      const body = document.getElementById('assessModalBody');
      const msg  = document.getElementById('assessModalMsg');
      const btn  = document.getElementById('btnAssessSubmit');

      if (_assessStep === 'gate') {
        _assessGateAnswers = collectAssessForm(body);
        const flags = checkRedFlags(_assessGateAnswers);
        const { data: { user } } = await supabase.auth.getUser();

        if (flags.length) {
          btn.disabled = true; btn.textContent = '…';
          const { data: assessment, error: aErr } = await supabase.from('assessments')
            .insert({ patient_id: user.id, type: _assessType, completed_at: new Date().toISOString() }).select().single();
          btn.disabled = false; btn.textContent = 'Continuer';
          if (aErr) { msg.textContent = 'Erreur : ' + aErr.message; return; }
          const respRows = Object.entries(_assessGateAnswers).map(([item_key, value]) => ({ assessment_id: assessment.id, instrument: 'neurodisk_core', item_key, value }));
          await supabase.from('assessment_responses').insert(respRows);
          await supabase.from('red_flag_alerts').insert(flags.map(flag_key => ({ patient_id: user.id, assessment_id: assessment.id, flag_key })));
          document.getElementById('assessModal').style.display = 'none';
          document.getElementById('redFlagModal').style.display = 'flex';
          loadAssessments(user.id);
          return;
        }

        _assessStep = 'form';
        document.getElementById('assessModalTitle').textContent = _assessType === 'initial' ? 'Bilan initial' : 'Réévaluation';
        renderMainForm();
        btn.textContent = 'Envoyer mon bilan';
        return;
      }

      // _assessStep === 'form'
      const mainAnswers = collectAssessForm(body);
      const answers = { ..._assessGateAnswers, ...mainAnswers };
      const pattern = deriveDirectionalPattern(answers);

      btn.disabled = true; btn.textContent = '…';
      const { data: { user } } = await supabase.auth.getUser();
      const { data: assessment, error: aErr } = await supabase.from('assessments')
        .insert({ patient_id: user.id, type: _assessType, completed_at: new Date().toISOString() }).select().single();
      if (aErr) { btn.disabled = false; btn.textContent = 'Envoyer mon bilan'; msg.textContent = 'Erreur : ' + aErr.message; return; }

      const respRows = Object.entries(answers).map(([item_key, value]) => ({ assessment_id: assessment.id, instrument: 'neurodisk_core', item_key, value }));
      await supabase.from('assessment_responses').insert(respRows);
      await supabase.from('assessment_scores').insert({
        assessment_id: assessment.id, instrument: 'neurodisk_core', raw_score: null, normalized_score: null,
        subscores: { directional_pattern: pattern },
      });

      btn.disabled = false; btn.textContent = 'Envoyer mon bilan';
      document.getElementById('assessModal').style.display = 'none';
      toast('Merci, votre bilan est enregistré.', 'success');
      loadAssessments(user.id);
    });

    async function loadResources(userId, isAdmin = false) {
      const audience = currentView === 'professional' ? 'professional' : 'patient';
      try {
        let resources;
        if (isAdmin) {
          const { data, error } = await supabase.from('resources').select('*')
            .eq('audience', audience).order('condition_tag').order('sort_order');
          if (error) throw error;
          resources = data;
        } else {
          const { data, error } = await supabase.from('patient_resources').select(`assigned_at, resource:resources (id,title,description,type,condition_tag,category,bunny_video_id,video_url,pdf_url,thumbnail_url,duration_sec,sort_order,audience)`).order('assigned_at', { ascending: false });
          if (error) throw error;
          resources = data.map(r => ({ ...r.resource, assigned_at: r.assigned_at }))
            .filter(r => r?.id && (r.audience || 'patient') === audience);
        }
        // Dé-duplication défensive : jamais deux fois la même ressource
        // (par id, et par contenu identique titre+type+fichier au cas où
        //  ce seraient des lignes distinctes mais identiques).
        const seen = new Set();
        resources = resources.filter(r => {
          const key = r.id + '|' + (r.title || '').trim().toLowerCase() + '|' + r.type + '|' + (r.pdf_url || r.video_url || r.bunny_video_id || '');
          const contentKey = (r.title || '').trim().toLowerCase() + '|' + r.type + '|' + (r.pdf_url || r.video_url || r.bunny_video_id || '');
          if (seen.has(r.id) || seen.has(contentKey)) return false;
          seen.add(r.id); seen.add(contentKey); seen.add(key);
          return true;
        });
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
          if (c.dataset.type==='video') openModal(c.dataset.id, c.dataset.title, c.dataset.url, c.dataset.direct==='1');
          else window.open(c.dataset.url, '_blank', 'noopener');
        });
        c.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); c.click(); } });
      });
    }

    // Extrait l'ID d'une URL YouTube (watch, youtu.be, embed, shorts)
    function ytId(url) {
      if (!url) return null;
      const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
      return m ? m[1] : null;
    }

    function renderCard(r) {
      const isVideo = r.type === 'video';
      const condLabel = COND[r.condition_tag] || r.condition_tag;
      // Lecture : YouTube (embed) en priorité, sinon fichier direct (HTML5), sinon ancien Bunny
      const yt = isVideo ? ytId(r.video_url) : null;
      const directVid = isVideo && !!r.video_url && !yt;
      const embedUrl = isVideo
        ? (yt ? `https://www.youtube-nocookie.com/embed/${yt}?rel=0&autoplay=1&playsinline=1`
           : (r.video_url || (r.bunny_video_id ? `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${r.bunny_video_id}?autoplay=true&responsive=true` : '')))
        : '';
      const isWord = r.type === 'word';
      const thumb = r.thumbnail_url ? `<img src="${esc(r.thumbnail_url)}" alt="" loading="lazy">` : `<div class="card__thumb-bg">${isVideo ? svgVideo() : svgPdf()}</div>`;
      const dur = isVideo && r.duration_sec ? `<span class="card__duration">${fmtDur(r.duration_sec)}</span>` : '';

      if (isVideo) {
        return `<article class="card" role="listitem" tabindex="0" data-id="${r.id}" data-type="video" data-direct="${directVid ? '1' : '0'}" data-url="${esc(embedUrl)}" data-title="${esc(r.title)}">
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
        const badgeLabel = isWord ? 'Word' : 'PDF';
        const ctaLabel   = isWord ? 'Ouvrir le document Word' : 'Ouvrir le PDF';
        return `<article class="card" role="listitem" tabindex="0" data-id="${r.id}" data-type="${isWord ? 'word' : 'pdf'}" data-url="${esc(r.pdf_url||'')}" data-title="${esc(r.title)}">
          <div class="card__thumb">${thumb}</div>
          <div class="card__body">
            <div class="card__meta">
              <span class="badge badge--${isWord ? 'word' : 'pdf'}">${badgeLabel}</span>
              <span class="badge badge--c-${r.condition_tag}">${condLabel}</span>
            </div>
            <h2 class="card__title">${esc(r.title)}</h2>
            ${r.description ? `<p class="card__desc">${esc(r.description)}</p>` : ''}
            <p class="card__cta"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg> ${ctaLabel}</p>
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

    function openModal(id, title, url, direct = false) {
      modalTitle.textContent = title;
      modalVideo.innerHTML = direct
        ? `<video src="${url}" controls autoplay playsinline style="width:100%;height:100%;display:block;background:#000"></video>`
        : `<iframe src="${url}" allowfullscreen allow="autoplay"></iframe>`;
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

    // ── Sécurité : 2FA (TOTP) pour admins/pros ─────────────
    function setupLibMfa() {
      if (window._libMfaInit) return; window._libMfaInit = true;
      let libFactorId = null;
      const modal = document.getElementById('modalMfaLib');
      const $ = id => document.getElementById(id);
      const close = () => { modal.style.display = 'none'; };
      $('btnMfaLibClose').addEventListener('click', close);
      modal.addEventListener('click', e => { if (e.target === modal) close(); });

      $('btnMfaLib').addEventListener('click', async () => {
        modal.style.display = 'flex';
        $('mfaLibEnrollBox').style.display = 'none';
        $('mfaLibActiveBox').style.display = 'none';
        $('mfaLibStatus').textContent = 'Chargement…';
        libFactorId = null;
        const { data: factors, error } = await supabase.auth.mfa.listFactors();
        if (error) { $('mfaLibStatus').textContent = 'Erreur : ' + error.message; return; }
        const verified = (factors?.totp || []).find(f => f.status === 'verified');
        if (verified) {
          libFactorId = verified.id;
          $('mfaLibStatus').textContent = 'État : activé.';
          $('mfaLibActiveBox').style.display = '';
        } else {
          for (const f of (factors?.totp || [])) { try { await supabase.auth.mfa.unenroll({ factorId: f.id }); } catch (_) {} }
          $('mfaLibStatus').textContent = 'État : désactivé. Configurez-le ci-dessous.';
          const { data, error: enErr } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator ' + Date.now() });
          if (enErr) { $('mfaLibStatus').textContent = 'Erreur : ' + enErr.message; return; }
          libFactorId = data.id;
          $('mfaLibQr').innerHTML = `<img src="${data.totp.qr_code}" alt="QR Sécurité" style="max-width:180px">`;
          $('mfaLibSecret').textContent = data.totp.secret;
          $('mfaLibMsg').textContent = '';
          $('mfaLibCode').value = '';
          $('mfaLibEnrollBox').style.display = '';
        }
      });

      $('btnMfaLibConfirm').addEventListener('click', async () => {
        const code = $('mfaLibCode').value.trim();
        $('mfaLibMsg').textContent = '';
        if (!/^\d{6}$/.test(code)) { $('mfaLibMsg').textContent = 'Entrez le code à 6 chiffres.'; return; }
        const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: libFactorId });
        if (cErr) { $('mfaLibMsg').textContent = 'Erreur : ' + cErr.message; return; }
        const { error: vErr } = await supabase.auth.mfa.verify({ factorId: libFactorId, challengeId: ch.id, code });
        if (vErr) { $('mfaLibMsg').textContent = 'Code invalide. Réessayez.'; return; }
        alert('Sécurité activée avec succès ✅');
        close();
      });

      $('btnMfaLibDisable').addEventListener('click', async () => {
        if (!libFactorId) return;
        if (!confirm('Désactiver la sécurité sur votre compte ?')) return;
        const { error } = await supabase.auth.mfa.unenroll({ factorId: libFactorId });
        if (error) { alert('Erreur : ' + error.message); return; }
        alert('Sécurité désactivée.');
        close();
      });
    }
    window.setupLibMfa = setupLibMfa;

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
      const isObjectifs = cat?.shows_objectifs;
      const isEducation = cat?.shows_education;

      if (isProgramme) {
        document.getElementById('section-exercices').style.display = '';
        if (!programmeLoaded) loadProgramme();
      } else if (isObjectifs) {
        document.getElementById('section-objectifs').style.display = '';
        loadObjectives();
      } else if (isEducation) {
        document.getElementById('section-education').style.display = '';
        loadEducation();
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
          if (c.dataset.type === 'video') openModal(c.dataset.id, c.dataset.title, c.dataset.url, c.dataset.direct==='1');
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
    let poseRefIds      = new Set(); // exercices avec démo coach

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) currentUserId = session.user.id;
    });

    async function loadProgramme() {
      programmeLoaded = true;
      const summaryEl = document.getElementById('programmeSummary');
      summaryEl.innerHTML = `<div class="state-wrap"><div class="spinner"></div></div>`;

      try {
        let session = null;
        try { ({ data: { session } } = await supabase.auth.getSession()); } catch {}

        let data = null;
        if (session) {
          const res = await supabase
            .from('programmes')
            .select('id, name, description, created_at, section_id, section:programme_sections(name, sort_order)')
            .eq('patient_id', session.user.id)
            .order('created_at', { ascending: false });
          if (res.error) throw res.error;
          data = res.data;
        }

        if (data && data.length) {
          allProgrammes = data;
          Cache.set('programmes', data);
        } else {
          allProgrammes = Cache.get('programmes') || data || [];
          if (!navigator.onLine) setOfflineBanner(true);
        }

        if (allProgrammes.length === 1) {
          openProgramme(allProgrammes[0].id);
        } else {
          renderProgrammeSummary();
        }

      } catch(e) {
        // Dernier recours : cache local
        allProgrammes = Cache.get('programmes') || [];
        if (allProgrammes.length) {
          if (!navigator.onLine) setOfflineBanner(true);
          if (allProgrammes.length === 1) openProgramme(allProgrammes[0].id);
          else renderProgrammeSummary();
        } else {
          document.getElementById('programmeSummary').innerHTML = `<div class="state-wrap"><div class="state-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><p class="state-title">Erreur de chargement</p><p class="state-text">Rechargez la page ou contactez la clinique.</p></div>`;
        }
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
              id, title, description, bunny_video_id, video_url, thumbnail_url, muscle_group,
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

        // Exercices ayant une démo coach (pour afficher le bouton « Filme-toi »)
        const { data: refs } = exIds.length ? await supabase.from('exercise_pose_refs').select('exercise_id').in('exercise_id', exIds) : { data: [] };
        poseRefIds = new Set((refs||[]).map(r => r.exercise_id));

        const completedToday = new Set((logs||[]).map(l => l.exercise_id));
        const logCounts = {};
        (allLogs||[]).forEach(l => { logCounts[l.exercise_id] = (logCounts[l.exercise_id]||0)+1; });

        programmeData = { exercises: data || [], completedToday, logCounts };
        Cache.set('prog_' + programmeId, data || []);
        showExercises();
        renderProgressCalendar();

      } catch(e) {
        const cached = Cache.get('prog_' + programmeId);
        if (cached && cached.length) {
          programmeData = { exercises: cached, completedToday: new Set(), logCounts: {} };
          if (!navigator.onLine) setOfflineBanner(true);
          showExercises();
          try { renderProgressCalendar(); } catch {}
        } else {
          grid.innerHTML = `<div class="state-wrap"><p class="state-title">Erreur de chargement</p></div>`;
        }
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
      const hasVideo = !!(ex.video_url || ex.bunny_video_id);
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
      const hasVideo = !!(ex.video_url || ex.bunny_video_id);
      const images   = (ex.exercise_images || []).sort((a,b) => a.sort_order - b.sort_order);
      const allImgs  = images.length > 0 ? images : (ex.thumbnail_url ? [{ url: ex.thumbnail_url }] : []);

      // ── Zone média ──
      const mediaEl = document.getElementById('exModalMedia');
      if (hasVideo) {
        const yt = ytId(ex.video_url);
        mediaEl.innerHTML = yt
          ? `<iframe src="https://www.youtube-nocookie.com/embed/${yt}?rel=0&playsinline=1" allowfullscreen allow="autoplay" style="width:100%;aspect-ratio:16/9;border:none;display:block;"></iframe>`
          : ex.video_url
            ? `<video src="${ex.video_url}" controls playsinline style="width:100%;aspect-ratio:16/9;display:block;background:#000"></video>`
            : `<iframe src="https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${ex.bunny_video_id}?autoplay=true&responsive=true" allowfullscreen allow="autoplay" style="width:100%;aspect-ratio:16/9;border:none;display:block;"></iframe>`;
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
        ${pe.notes ? `<div class="ex-modal__note"><strong>📝 Note du professionnel</strong>${esc(pe.notes)}</div>` : ''}
        ${poseRefIds.has(ex.id) ? `
          <button class="btn-filme-toi" onclick="openCoachPractice('${esc(ex.id)}')">
            🎥 Filme-toi pour être corrigé
          </button>
          <p class="ex-modal__filme-hint">Ta caméra reste sur ton appareil — rien n'est enregistré ni envoyé.</p>` : ''}`;

      exModalOverlay.classList.add('is-open');
      exModalOverlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    window.openCoachPractice = (exId) => {
      window.open(`tools/coach-demo.html?exercise=${encodeURIComponent(exId)}&mode=practice`, '_blank');
    };

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

    // ══════════════════════════════════════════════════════
    // CHAT PROFESSIONNEL (admins + pros uniquement)
    // ══════════════════════════════════════════════════════
    let _chatUserId   = null;
    let _chatUserName = null;
    let _chatConvId   = null;
    let _chatConvs    = [];
    let _chatProfiles = [];
    let _chatChannel  = null;
    let _chatFileEl   = null;

    const _AV_COLORS = [
      { bg:'#dbeafe', fg:'#1e40af' }, { bg:'#d1fae5', fg:'#065f46' },
      { bg:'#ede9fe', fg:'#4c1d95' }, { bg:'#fef3c7', fg:'#78350f' },
      { bg:'#fce7f3', fg:'#831843' }, { bg:'#fee2e2', fg:'#7f1d1d' },
    ];
    function _chatAvStyle(name) {
      const i = (name||'U').charCodeAt(0) % _AV_COLORS.length;
      return `background:${_AV_COLORS[i].bg};color:${_AV_COLORS[i].fg}`;
    }
    function _chatInit(name) {
      if (!name) return '?';
      const p = name.trim().split(/\s+/);
      return (p[0][0]+(p[1]?.[0]||'')).toUpperCase();
    }
    function _chatFmt(ts) {
      if (!ts) return '';
      const d = new Date(ts), now = new Date();
      if (d.toDateString()===now.toDateString()) return d.toLocaleTimeString('fr-CA',{hour:'2-digit',minute:'2-digit'});
      if ((now-d)/86400000<7) return d.toLocaleDateString('fr-CA',{weekday:'short'});
      return d.toLocaleDateString('fr-CA',{month:'short',day:'numeric'});
    }
    function _esc(s) { const d=document.createElement('div');d.textContent=s;return d.innerHTML; }

    async function initLibraryChat(userId, userName) {
      _chatUserId   = userId;
      _chatUserName = userName;
      document.getElementById('libChatBtn').style.display = 'block';
      await _chatEnsureGeneral();
      await _chatLoadProfiles();
      await _chatLoadConvs();
      _chatSubscribe();
    }

    async function _chatLoadProfiles() {
      const { data, error } = await supabase.rpc('chat_staff_profiles');
      if (error) { console.error('[chat] profiles:', error); return; }
      _chatProfiles = data || [];
    }

    async function _chatEnsureGeneral() {
      const { error } = await supabase.rpc('ensure_general_conversation');
      if (error) console.error('[chat] ensureGeneral:', error);
    }

    async function _chatLoadConvs() {
      const { data: parts } = await supabase.from('chat_participants').select('conversation_id').eq('user_id',_chatUserId);
      if (!parts?.length) { _chatConvs=[]; _chatRenderList(); return; }
      const ids = parts.map(p=>p.conversation_id);
      const [{ data:convs },{ data:allP },{ data:lastM },{ data:unreadM }] = await Promise.all([
        supabase.from('chat_conversations').select('*').in('id',ids),
        supabase.from('chat_participants').select('conversation_id,user_id').in('conversation_id',ids),
        supabase.from('chat_messages').select('conversation_id,content,created_at,sender_id,attachment_url').in('conversation_id',ids).order('created_at',{ascending:false}),
        supabase.from('chat_messages').select('conversation_id,read_by').in('conversation_id',ids).not('read_by','cs',`{${_chatUserId}}`),
      ]);
      if (!_chatProfiles.length) await _chatLoadProfiles();
      const lastMap={}, unreadMap={}, partMap={};
      (lastM||[]).forEach(m=>{ if(!lastMap[m.conversation_id]) lastMap[m.conversation_id]=m; });
      (unreadM||[]).forEach(m=>{ unreadMap[m.conversation_id]=(unreadMap[m.conversation_id]||0)+1; });
      (allP||[]).forEach(p=>{ (partMap[p.conversation_id]||=[]).push(p.user_id); });
      _chatConvs=(convs||[]).map(c=>{
        let name=c.name||'général';
        if(c.type==='direct'){
          const oid=(partMap[c.id]||[]).find(id=>id!==_chatUserId);
          const o=_chatProfiles.find(p=>p.id===oid);
          name=o?.full_name||o?.email||'Conversation';
        }
        return{...c,displayName:name,lastMsg:lastMap[c.id]||null,unread:unreadMap[c.id]||0};
      }).sort((a,b)=>new Date(b.lastMsg?.created_at||b.created_at)-new Date(a.lastMsg?.created_at||a.created_at));
      _chatRenderList();
      _chatUpdateBadge();
    }

    function _chatRenderList() {
      const el=document.getElementById('libChatConvList');
      if (!el) return;
      el.innerHTML=_chatConvs.map(c=>{
        const isG=c.type==='group';
        const ini=isG?'#':_chatInit(c.displayName);
        const sty=isG?'background:#dbeafe;color:#1e40af':_chatAvStyle(c.displayName);
        const prev=c.lastMsg?(c.lastMsg.attachment_url?'📎 Pièce jointe':(c.lastMsg.content||'').slice(0,28)):'Aucun message';
        return `<div class="lc-conv-item${_chatConvId===c.id?' is-active':''}" onclick="_chatOpen('${c.id}')">
          <div class="lc-av" style="${sty}">${ini}</div>
          <div class="lc-conv-meta">
            <div class="lc-conv-name">${_esc(c.displayName)}</div>
            <div class="lc-conv-prev">${_esc(prev)}</div>
          </div>
          ${c.unread?`<div class="lc-badge">${c.unread}</div>`:''}
        </div>`;
      }).join('');
    }

    function _chatUpdateBadge() {
      const n=_chatConvs.reduce((s,c)=>s+c.unread,0);
      const b=document.getElementById('libChatBadge');
      b.textContent=n; b.style.display=n?'flex':'none';
    }

    window._chatOpen = async (convId) => {
      _chatConvId=convId;
      _chatRenderList();
      const c=_chatConvs.find(x=>x.id===convId);
      document.getElementById('libChatConvName').textContent=c?.type==='group'?'#'+c.displayName:c?.displayName||'';
      const rn=document.getElementById('libChatRenameBtn');
      if(rn) rn.style.display=(c?.type==='group'&&c?.name!=='général')?'flex':'none';
      document.getElementById('libChatMsgsPane').style.display='flex';
      document.getElementById('libChatNoConv').style.display='none';
      document.getElementById('libChatMsgsList').innerHTML='<div class="lc-empty">Chargement…</div>';
      await _chatMarkRead(convId);
      await _chatRenderMsgs(convId);
      if(c){c.unread=0;_chatUpdateBadge();_chatRenderList();}
    };

    async function _chatRenderMsgs(convId) {
      const {data:msgs}=await supabase.from('chat_messages').select('*').eq('conversation_id',convId).order('created_at',{ascending:true});
      const list=document.getElementById('libChatMsgsList');
      if(!msgs?.length){list.innerHTML='<div class="lc-empty">Aucun message — soyez le premier à écrire !</div>';return;}
      let lastDate='';
      list.innerHTML=msgs.map(m=>{
        const isMe=m.sender_id===_chatUserId;
        const s=_chatProfiles.find(p=>p.id===m.sender_id);
        const sName=s?.full_name||s?.email||'Inconnu';
        const d=new Date(m.created_at);
        const dl=d.toLocaleDateString('fr-CA',{weekday:'long',day:'numeric',month:'long'});
        const sep=dl!==lastDate?`<div class="lc-date-sep">${dl}</div>`:'';
        lastDate=dl;
        const t=d.toLocaleTimeString('fr-CA',{hour:'2-digit',minute:'2-digit'});
        const body=m.attachment_url
          ?`${m.content?`<div class="lc-bubble${isMe?' me':''}">${_esc(m.content)}</div>`:''}
            <a class="lc-attach" href="${_esc(m.attachment_url)}" target="_blank" rel="noopener">📎 ${_esc(m.attachment_url.split('/').pop().slice(0,38))}</a>`
          :`<div class="lc-bubble${isMe?' me':''}">${_esc(m.content||'')}</div>`;
        return `${sep}<div class="lc-msg${isMe?' me':''}">
          <div class="lc-av sm" style="${_chatAvStyle(sName)}">${_chatInit(sName)}</div>
          <div class="lc-msg-col">
            ${!isMe?`<div class="lc-sender">${_esc(sName)}</div>`:''}
            ${body}
            <div class="lc-time">${t}</div>
          </div>
        </div>`;
      }).join('');
      list.scrollTop=list.scrollHeight;
    }

    async function _chatMarkRead(convId) {
      const {data}=await supabase.from('chat_messages').select('id,read_by').eq('conversation_id',convId).not('read_by','cs',`{${_chatUserId}}`);
      for(const m of data||[]){
        await supabase.from('chat_messages').update({read_by:[...(m.read_by||[]),_chatUserId]}).eq('id',m.id);
      }
    }

    function _chatSubscribe() {
      _chatChannel=supabase.channel('lib-chat')
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},async p=>{
          const m=p.new;
          if(!_chatProfiles.find(x=>x.id===m.sender_id)) await _chatLoadProfiles();
          if(_chatConvId===m.conversation_id){
            await _chatRenderMsgs(m.conversation_id);
            await _chatMarkRead(m.conversation_id);
          } else {
            const c=_chatConvs.find(x=>x.id===m.conversation_id);
            if(c){c.unread++;c.lastMsg=m;_chatRenderList();_chatUpdateBadge();}
            else await _chatLoadConvs();
          }
        }).subscribe();
    }

    async function _chatSend() {
      if(!_chatConvId) return;
      const ta=document.getElementById('libChatTextarea');
      const txt=ta.value.trim(); if(!txt) return;
      ta.value=''; ta.style.height='36px';
      await supabase.from('chat_messages').insert({conversation_id:_chatConvId,sender_id:_chatUserId,content:txt,read_by:[_chatUserId]});
    }

    async function _chatSendFile(file) {
      if(!_chatConvId||!file) return;
      try {
        const safe=file.name.replace(/[^a-zA-Z0-9.\-_]/g,'_');
        const {data,error}=await supabase.storage.from('PDFS formation').upload(`chat/${Date.now()}-${safe}`,file,{upsert:false});
        if(error) throw error;
        const {data:{publicUrl}}=supabase.storage.from('PDFS formation').getPublicUrl(data.path);
        await supabase.from('chat_messages').insert({conversation_id:_chatConvId,sender_id:_chatUserId,content:null,attachment_url:publicUrl,read_by:[_chatUserId]});
      } catch(e) { console.error('[chat attach]',e); }
    }

    window._chatOpenNewConv = async () => {
      if (!_chatProfiles.length) await _chatLoadProfiles();
      const pros=_chatProfiles.filter(p=>p.id!==_chatUserId);
      const ul=document.getElementById('libChatUserList');
      ul.innerHTML=pros.map(p=>{
        const role=p.is_admin&&!p.is_professional?'Admin':'Professionnel';
        return `<div class="lc-user-item" onclick="_chatStartDirect('${p.id}')">
          <div class="lc-av" style="${_chatAvStyle(p.full_name||p.email)}">${_chatInit(p.full_name||p.email)}</div>
          <div><div class="lc-user-name">${_esc(p.full_name||p.email)}</div><div class="lc-user-role">${role}</div></div>
        </div>`;
      }).join('');
      document.getElementById('libChatUserSearch').value='';
      document.getElementById('libModalNewConv').classList.add('is-open');
    };

    window._chatOpenNewGroup = async () => {
      if (!_chatProfiles.length) await _chatLoadProfiles();
      const pros=_chatProfiles.filter(p=>p.id!==_chatUserId);
      const ul=document.getElementById('libChatGroupList');
      ul.innerHTML=pros.map(p=>`<label class="lc-user-item" style="cursor:pointer">
        <input type="checkbox" value="${p.id}" style="margin-right:.4rem;width:16px;height:16px;accent-color:#185FA5">
        <div class="lc-av" style="${_chatAvStyle(p.full_name||p.email)}">${_chatInit(p.full_name||p.email)}</div>
        <div><div class="lc-user-name">${_esc(p.full_name||p.email)}</div></div>
      </label>`).join('');
      document.getElementById('libGroupName').value='';
      document.getElementById('libModalNewGroup').classList.add('is-open');
    };

    window._chatCreateGroup = async () => {
      const name=document.getElementById('libGroupName').value.trim();
      if(!name){ alert('Donnez un nom au groupe.'); return; }
      const ids=[...document.querySelectorAll('#libChatGroupList input:checked')].map(c=>c.value);
      if(!ids.length){ alert('Sélectionnez au moins un membre.'); return; }
      document.getElementById('libModalNewGroup').classList.remove('is-open');
      document.getElementById('libChatPanel').classList.add('is-open');
      try {
        const { data: convId, error } = await supabase.rpc('create_group_conversation', { group_name: name, member_ids: ids });
        if (error) throw error;
        await _chatLoadConvs();
        await window._chatOpen(convId);
      } catch(err){ console.error('[chat] createGroup:', err); }
    };

    window._chatRenameGroup = async () => {
      const c=_chatConvs.find(x=>x.id===_chatConvId);
      if(!c||c.type!=='group') return;
      const newName=prompt('Nouveau nom du groupe :', c.displayName);
      if(!newName||!newName.trim()) return;
      try {
        const { error } = await supabase.rpc('rename_conversation', { conv_id: _chatConvId, new_name: newName.trim() });
        if (error) throw error;
        await _chatLoadConvs();
        document.getElementById('libChatConvName').textContent='#'+newName.trim();
      } catch(err){ console.error('[chat] rename:', err); }
    };

    window._chatStartDirect = async (otherId) => {
      document.getElementById('libModalNewConv').classList.remove('is-open');
      document.getElementById('libChatPanel').classList.add('is-open');
      try {
        const { data: convId, error } = await supabase.rpc('start_direct_conversation', { other_user_id: otherId });
        if (error) throw error;
        await _chatLoadConvs();
        await window._chatOpen(convId);
      } catch(err) {
        console.error('[chat] startDirect:', err);
      }
    };

    function _chatBindEvents() {
      document.getElementById('libChatBtn').addEventListener('click',()=>{
        document.getElementById('libChatPanel').classList.toggle('is-open');
        if(!_chatConvId&&_chatConvs.length) window._chatOpen(_chatConvs[0].id);
      });
      document.getElementById('libChatClose').addEventListener('click',()=>document.getElementById('libChatPanel').classList.remove('is-open'));
      document.getElementById('libChatSendBtn').addEventListener('click',_chatSend);
      document.getElementById('libChatTextarea').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();_chatSend();}});
      document.getElementById('libChatTextarea').addEventListener('input',function(){this.style.height='36px';this.style.height=Math.min(this.scrollHeight,100)+'px';});
      document.getElementById('libChatAttachBtn').addEventListener('click',()=>{
        if(!_chatFileEl){_chatFileEl=document.createElement('input');_chatFileEl.type='file';_chatFileEl.accept='image/*,.pdf,.doc,.docx';_chatFileEl.addEventListener('change',()=>{if(_chatFileEl.files?.[0])_chatSendFile(_chatFileEl.files[0]);});}
        _chatFileEl.click();
      });
      document.getElementById('libChatUserSearch').addEventListener('input',function(){
        const q=this.value.toLowerCase();
        document.querySelectorAll('#libChatUserList .lc-user-item').forEach(el=>{el.style.display=el.textContent.toLowerCase().includes(q)?'':'none';});
      });
      document.getElementById('libModalNewConv').addEventListener('click',e=>{if(e.target===document.getElementById('libModalNewConv'))document.getElementById('libModalNewConv').classList.remove('is-open');});
      document.getElementById('libModalNewGroup').addEventListener('click',e=>{if(e.target===document.getElementById('libModalNewGroup'))document.getElementById('libModalNewGroup').classList.remove('is-open');});
    }

