    let selectedTrip = null;

    function renderAssess() {
      const state = OPS.load();
      const queue = OPS.queueFor(state, 'pending_assessment');
      const tbody = document.getElementById('assess-queue');
      if (queue.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94A3B8;">Không còn đơn chờ khảo sát.</td></tr>';
      } else {
        tbody.innerHTML = queue.map(t => `
          <tr>
            <td class="code">${t.id}</td>
            <td>${t.orderId}</td>
            <td>${t.customer}</td>
            <td>${t.route}</td>
            <td>${t.horses}</td>
            <td>${t.depart}</td>
            <td><a class="action-link" onclick="selectTrip('${t.id}')">Đánh giá</a></td>
          </tr>`).join('');
      }
      if (selectedTrip && !queue.find(t => t.id === selectedTrip)) selectedTrip = null;
      const card = document.getElementById('assess-detail-card');
      if (!selectedTrip) { card.style.display = 'none'; return; }
      const t = OPS.findTrip(state, selectedTrip);
      card.style.display = '';
      document.getElementById('assess-title').textContent = `Đánh giá — ${t.id} (${t.route})`;
      document.getElementById('assess-info').innerHTML = `
        <div class="info-row"><span class="info-label">Mã đơn Manager:</span><span class="info-value">${t.orderId}</span></div>
        <div class="info-row"><span class="info-label">Khách hàng:</span><span class="info-value">${t.customer}</span></div>
        <div class="info-row"><span class="info-label">Số ngựa / Khởi hành:</span><span class="info-value">${t.horses} con — ${t.depart}</span></div>
        <div class="info-row"><span class="info-label">Số chặng dự kiến:</span><span class="info-value">${t.legs.length} chặng</span></div>`;
    }

    function selectTrip(id) {
      selectedTrip = id;
      renderAssess();
    }

    function confirmAssess() {
      const pass = document.getElementById('assess-verdict').value === 'pass';
      const note = document.getElementById('assess-note').value;
      const r = OPS.assessTrip(OPS.load(), selectedTrip, pass, note);
      if (!r.ok) { alert('Đơn không còn ở hàng đợi khảo sát.'); return; }
      document.getElementById('assess-note').value = '';
      renderAssess();
    }

    renderAssess();
