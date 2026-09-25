    function toast(msg) {
      let box = document.getElementById('ops-toast');
      if (!box) {
        box = document.createElement('div');
        box.id = 'ops-toast';
        box.style.cssText = 'position:fixed;top:24px;right:24px;z-index:10000;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(box);
      }
      const el = document.createElement('div');
      el.style.cssText = 'background:#0f172a;color:#fff;padding:12px 18px;border-radius:8px;font-size:13px;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
      el.textContent = msg;
      box.appendChild(el);
      setTimeout(() => el.remove(), 2600);
    }
