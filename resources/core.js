// Gotas Helper – Core (core.js)
// Expose as window.GH to avoid globals clash
(() => {
  if (window.GH) return; // idempotent
  const $  = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));
  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
  const ready = (fn) => (document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn) : fn());

  const waitFor = (selector, {timeout=8000, root=document} = {}) =>
    new Promise((res, rej) => {
      const el = root.querySelector(selector);
      if (el) return res(el);
      const obs = new MutationObserver(() => {
        const e = root.querySelector(selector);
        if (e) { obs.disconnect(); res(e); }
      });
      obs.observe(root, {childList:true, subtree:true});
      setTimeout(() => { obs.disconnect(); rej(new Error('waitFor timeout: '+selector)); }, timeout);
    });

  const toast = (msg, t=1800) => {
    const n = document.createElement('div');
    n.textContent = msg;
    Object.assign(n.style, {
      position:'fixed', right:'16px', bottom:'16px', padding:'8px 12px',
      background:'rgba(0,0,0,.85)', color:'#fff', borderRadius:'6px',
      fontSize:'14px', zIndex:2147483647
    });
    document.body.appendChild(n);
    setTimeout(() => n.remove(), t);
  };

  const getCsrf = () =>
    document.querySelector('meta[name="csrf-token"]')?.content ||
    document.querySelector('input[name="_csrfToken"]')?.value || null;

  const fetchWrapper = async (url, {method='GET', headers={}, body, timeout=12000} = {}) => {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort('timeout'), timeout);
    const common = {
      credentials: 'same-origin',
      headers: {'X-Requested-With':'XMLHttpRequest', ...headers},
      method, body, signal: ctrl.signal
    };
    const resp = await fetch(url, common).catch((e) => { clearTimeout(id); throw e; });
    clearTimeout(id);
    let data = null;
    const ct = resp.headers.get('content-type') || '';
    try { data = ct.includes('application/json') ? await resp.json() : await resp.text(); } catch {}
    return { ok: resp.ok, status: resp.status, data, ct };
  };

  const modal = (() => {
    let open = false;
    const ensure = () => {
      if (document.getElementById('gh-core-backdrop')) return;
      const css = `
        #gh-core-backdrop{position:fixed; inset:0; background:rgba(0,0,0,.45);
          display:none; align-items:center; justify-content:center; z-index:2147483646;}
        #gh-core-modal{background:#fff; width:min(1000px,95vw); max-height:92vh; overflow:auto;
          border-radius:10px; box-shadow:0 10px 40px rgba(0,0,0,.25); font-family:inherit;}
        #gh-core-modal header{display:flex; align-items:center; justify-content:space-between;
          padding:12px 16px; border-bottom:1px solid #eee;}
        #gh-core-modal h3{margin:0; font-size:18px; font-weight:600;}
        #gh-core-modal .body{padding:16px;}
        #gh-core-modal footer{display:flex; gap:8px; justify-content:flex-end; padding:12px 16px; border-top:1px solid #eee;}
      `;
      const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
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

  window.GH = { $, $$, on, ready, waitFor, toast, getCsrf, fetchWrapper, modal };
})();
