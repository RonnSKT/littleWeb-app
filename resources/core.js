// ================================
// File: resources/core.js
// ================================
// == Gotas Helper — Core v0.1.0 ==
// Superset com retrocompatibilidade: exporta window.GH (subset) e window.__GOTAS_CORE__ (superset)
(() => {
  if (window.__GOTAS_CORE__) return; // idempotente (superset)

  // ===== DOM helpers =====
  const $  = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
  const ready = (fn) => (document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn)
    : fn());

  const waitFor = (selector, {timeout=8000, root=document} = {}) => new Promise((res, rej) => {
    const el = root.querySelector(selector);
    if (el) return res(el);
    const obs = new MutationObserver(() => {
      const e = root.querySelector(selector);
      if (e) { obs.disconnect(); res(e); }
    });
    obs.observe(root, { childList:true, subtree:true });
    setTimeout(() => { obs.disconnect(); rej(new Error('waitFor timeout: '+selector)); }, timeout);
  });

  const waitForAll = (selector, {timeout=8000, root=document, min=1} = {}) => new Promise((res, rej) => {
    const els = Array.from(root.querySelectorAll(selector));
    if (els.length >= min) return res(els);
    const obs = new MutationObserver(() => {
      const found = Array.from(root.querySelectorAll(selector));
      if (found.length >= min) { obs.disconnect(); res(found); }
    });
    obs.observe(root, { childList:true, subtree:true });
    setTimeout(() => { obs.disconnect(); rej(new Error('waitForAll timeout: '+selector)); }, timeout);
  });

  const observeMutations = (root, opts, cb) => {
    const mo = new MutationObserver(cb);
    mo.observe(root, opts);
    return { disconnect: () => mo.disconnect() };
  };

  // ===== CSS & UI =====
  const injectCSS = (css) => { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); return st; };

  const toast = (msg, t=1800, {type}={}) => {
    const n = document.createElement('div');
    n.textContent = msg;
    const bg = type==='error' ? 'rgba(200,0,0,.9)' : type==='success' ? 'rgba(0,140,60,.9)' : 'rgba(0,0,0,.85)';
    Object.assign(n.style, { position:'fixed', right:'16px', bottom:'16px', padding:'8px 12px', background:bg, color:'#fff', borderRadius:'6px', fontSize:'14px', zIndex:2147483647 });
    document.body.appendChild(n);
    setTimeout(() => n.remove(), t);
  };

  const modal = (() => {
    let open = false;
    const ensure = () => {
      if (document.getElementById('gh-core-backdrop')) return;
      const css = `#gh-core-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;z-index:2147483646;}#gh-core-modal{background:#fff;width:min(1000px,95vw);max-height:92vh;overflow:auto;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.25);font-family:inherit;}#gh-core-modal header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #eee;}#gh-core-modal h3{margin:0;font-size:18px;font-weight:600;}#gh-core-modal .body{padding:16px;}#gh-core-modal footer{display:flex;gap:8px;justify-content:flex-end;padding:12px 16px;border-top:1px solid #eee;}`;
      injectCSS(css);
      const bd = document.createElement('div');
      bd.id = 'gh-core-backdrop';
      bd.innerHTML = `
        <div id="gh-core-modal" role="dialog" aria-modal="true" aria-labelledby="gh-core-title">
          <header><h3 id="gh-core-title">Gotas</h3><button id="gh-core-close" aria-label="Fechar">×</button></header>
          <div class="body" id="gh-core-slot"></div>
          <footer><button class="btn" id="gh-core-ok">OK</button></footer>
        </div>`;
      document.body.appendChild(bd);
      document.getElementById('gh-core-close').onclick = () => modal.close();
      bd.addEventListener('click', (e)=>{ if(e.target.id==='gh-core-backdrop') modal.close(); });
      document.addEventListener('keydown', (e)=>{ if(open && e.key==='Escape') modal.close(); });
    };
    return {
      open(title, html) {
        ensure();
        open = true;
        document.getElementById('gh-core-title').textContent = title || 'Gotas';
        document.getElementById('gh-core-slot').innerHTML = html || '';
        document.getElementById('gh-core-backdrop').style.display = 'flex';
        document.body.style.overflow = 'hidden';
      },
      close() {
        open = false;
        document.getElementById('gh-core-backdrop').style.display = 'none';
        document.body.style.overflow = '';
      },
      slotEl() { return document.getElementById('gh-core-slot'); }
    };
  })();

  // ===== CSRF =====
  const getCsrf = () => document.querySelector('meta[name="csrf-token"]')?.content || document.querySelector('input[name="_csrfToken"]')?.value || null;

  // ===== Logger =====
  const logger = (() => {
    const LS_KEY = 'gotas:debug';
    const enabled = () => (localStorage.getItem(LS_KEY) === '1');
    const fmt = (lvl, tag, args) => [`[Gotas:${lvl}]`, tag ? `[${tag}]` : '', ...args];
    const api = (tag) => ({
      debug: (...a) => enabled() && console.debug(...fmt('debug', tag, a)),
      info:  (...a) => console.info (...fmt('info',  tag, a)),
      warn:  (...a) => console.warn (...fmt('warn',  tag, a)),
      error: (...a) => console.error(...fmt('error', tag, a)),
      child: (childTag) => api(tag ? `${tag}:${childTag}` : childTag)
    });
    api.enable = () => localStorage.setItem(LS_KEY, '1');
    api.disable = () => localStorage.removeItem(LS_KEY);
    api.isEnabled = enabled;
    return api('core');
  })();

  // ===== Storage (KV) =====
  const kv = (() => {
    const hasGM = typeof GM_getValue === 'function';
    const nsKey = (k, ns) => ns ? `${ns}:${k}` : k;
    const get = (k, def=null, {ns}={}) => {
      const key = nsKey(k, ns);
      try {
        if (hasGM) return GM_getValue(key, def);
        const raw = localStorage.getItem(key);
        return raw == null ? def : JSON.parse(raw);
      } catch { return def; }
    };
    const set = (k, v, {ns}={}) => {
      const key = nsKey(k, ns);
      if (hasGM) return GM_setValue(key, v);
      localStorage.setItem(key, JSON.stringify(v));
    };
    const del = (k, {ns}={}) => {
      const key = nsKey(k, ns);
      if (hasGM) return GM_deleteValue(key);
      localStorage.removeItem(key);
    };
    return { get, set, del };
  })();

  // ===== HTTP =====
  const fetchWrapper = async (url, { method='GET', headers={}, body, timeout=12000 } = {}) => {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort('timeout'), timeout);
    const common = { credentials:'same-origin', headers:{ 'X-Requested-With':'XMLHttpRequest', ...headers }, method, body, signal: ctrl.signal };
    const resp = await fetch(url, common).catch((e) => { clearTimeout(id); throw e; });
    clearTimeout(id);
    let data = null; const ct = resp.headers.get('content-type') || '';
    try { data = ct.includes('application/json') ? await resp.json() : await resp.text(); } catch {}
    return { ok: resp.ok, status: resp.status, data, ct, headers: resp.headers };
  };
  const http = {
    request: fetchWrapper,
    get:  (url, opts={}) => fetchWrapper(url, { ...opts, method:'GET' }),
    post: (url, body, opts={}) => fetchWrapper(url, { ...opts, method:'POST', headers:{ 'Content-Type':'application/json', ...(opts.headers||{}) }, body: typeof body==='string'? body : JSON.stringify(body) }),
    put:  (url, body, opts={}) => fetchWrapper(url, { ...opts, method:'PUT',  headers:{ 'Content-Type':'application/json', ...(opts.headers||{}) }, body: typeof body==='string'? body : JSON.stringify(body) }),
    del:  (url, opts={}) => fetchWrapper(url, { ...opts, method:'DELETE' })
  };

  // ===== Router (URL change hook) =====
  const router = (() => {
    const listeners = new Set();
    const notify = () => listeners.forEach(fn => { try { fn(location.href); } catch(e){ logger.error('router cb', e); } });
    const origPush = history.pushState; const origRep = history.replaceState;
    history.pushState = function() { origPush.apply(this, arguments); notify(); };
    history.replaceState = function() { origRep.apply(this, arguments); notify(); };
    window.addEventListener('popstate', notify);
    window.addEventListener('hashchange', notify);
    const onURLChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
    const matchRoute = ({ url, dom }) => {
      let ok = true;
      if (url) {
        if (url.includes && !location.href.includes(url.includes)) ok = false;
        if (url.startsWith && !location.href.startsWith(url.startsWith)) ok = false;
        if (url.regex && !(new RegExp(url.regex).test(location.href))) ok = false;
      }
      if (ok && dom?.selector) ok = !!document.querySelector(dom.selector);
      return ok;
    };
    return { onURLChange, matchRoute };
  })();

  // ===== Registry de módulos (mínimo viável) =====
  const modules = (() => {
    const regs = new Map();
    const active = new Map();
    const log = logger.child('modules');

    const evaluate = () => {
      regs.forEach((def, id) => {
        const shouldRun = (def.routes || []).some(r => router.matchRoute(r)) && (!def.guard || def.guard());
        const isRunning = active.has(id);
        if (shouldRun && !isRunning) {
          try {
            const ctx = { id, state:{}, dispose:[], observe:null };
            const stopUrl = router.onURLChange(() => def.onRouteChange?.(ctx));
            ctx.dispose.push(stopUrl);
            Promise.resolve(def.init(ctx)).then(() => { active.set(id, ctx); log.info('init', id); })
              .catch(e => { log.error('init fail', id, e); toast('Falha ao iniciar módulo', 1800, {type:'error'}); });
          } catch (e) { log.error('init throw', id, e); }
        } else if (!shouldRun && isRunning) {
          const ctx = active.get(id);
          try { def.teardown?.(ctx); } catch(e){ log.error('teardown', id, e); }
          ctx?.dispose?.forEach(fn => { try{ fn(); }catch{} });
          ctx?.observe?.disconnect?.();
          active.delete(id);
          log.info('teardown', id);
        }
      });
    };

    router.onURLChange(evaluate);
    ready(evaluate);

    const register = (def) => { regs.set(def.id, def); evaluate(); };
    return { register };
  })();

  // ===== Menu (debug) =====
  try { if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('Gotas: Debug ON',  () => { logger.enable(); toast('Debug ON'); });
    GM_registerMenuCommand('Gotas: Debug OFF', () => { logger.disable(); toast('Debug OFF'); });
  }} catch {}

  // ===== Exports =====
  const Core = {
    version: '0.1.0',
    // dom
    $, $$, on, ready, waitFor, waitForAll, observeMutations,
    // ui
    injectCSS, toast, modal,
    // csrf
    getCsrf,
    // net
    fetchWrapper, http,
    // storage
    kv,
    // router & modules
    router, modules,
    // logger
    logger
  };

  // Superset oficial
  window.__GOTAS_CORE__ = Core;

  // Retrocompat: manter window.GH com subset
  if (!window.GH) {
    window.GH = { $, $$, on, ready, waitFor, toast, getCsrf, fetchWrapper, modal };
  }
})();
