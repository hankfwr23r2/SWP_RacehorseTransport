    let selectedTrip = null;

    function renderRoute() {
      const state = OPS.load();
      const queue = OPS.queueFor(state, 'awaiting_routing');
      document.getElementById('route-queue').innerHTML = queue.length ? queue.map(t => `
        <tr>
          <td class="code">${t.id}</td>
          <td>${t.customer}</td>
          <td>${t.route}</td>
          <td>${t.horses}</td>
          <td>${t.depart}</td>
          <td><span class="badge badge-info">${OPS.STATUS_LABEL[t.status]}</span></td>
          <td><a class="action-link" onclick="selectTrip('${t.id}')">Lập lộ trình</a></td>
        </tr>`).join('') :
        '<tr><td colspan="7" style="text-align:center;color:#94A3B8;">Không còn chuyến chờ lập lộ trình. Nhận thêm ở Đánh giá khả thi.</td></tr>';
      if (!selectedTrip || !queue.find(t => t.id === selectedTrip)) selectedTrip = queue.length ? queue[0].id : null;
      const box = document.getElementById('route-detail');
      if (!selectedTrip) { box.innerHTML = ''; return; }
      const t = OPS.findTrip(state, selectedTrip);
      box.innerHTML = `
        <div class="card-title"><div class="icon"></div> Lập Lộ trình — ${t.id} (${t.route})</div>
        <div class="divider"></div>
        <div class="info-row"><span class="info-label">Mã đơn Manager:</span><span class="info-value">${t.orderId} · ${t.customer}</span></div>
        <div class="info-row"><span class="info-label">Số ngựa / Khởi hành:</span><span class="info-value">${t.horses} con — ${t.depart}</span></div>
        ${t.assessNote ? `<div class="info-row"><span class="info-label">Ghi chú khảo sát:</span><span class="info-value">${t.assessNote}</span></div>` : ''}
        <div style="font-size:14px;font-weight:600;margin:16px 0;">Các chặng Lộ trình (Legs)</div>
        ${t.legs.map(l => {
          const v = OPS.vehicleById(state, l.vehicleId);
          return `<div style="border:1px solid #E8EAED;border-radius:8px;padding:16px;margin-bottom:12px;background:#FAFBFC;">
            <div style="font-weight:600;font-size:14px;margin-bottom:8px;">Chặng ${l.no}: ${l.from} → ${l.to}</div>
            <div class="info-row"><span class="info-label">Xe:</span><span class="info-value">${v ? `${v.id} — ${v.name} (${v.plate})` : 'chưa gán'}</span></div>
            <div class="info-row"><span class="info-label">Tài xế / Hộ tống:</span><span class="info-value">${OPS.staffName(state, l.driverId)} / ${OPS.staffName(state, l.escortId)} (phân công ở OPS-08)</span></div>
          </div>`;
        }).join('')}
        <div class="flex-end mt-16">
          <button class="btn btn-outline" onclick="window.location.href='OPS-03.html'">Về Khả thi</button>
          <button class="btn btn-primary" onclick="confirmRoute()">Xác nhận lộ trình → Phân công</button>
        </div>`;
    }

    function selectTrip(id) {
      selectedTrip = id;
      renderRoute();
    }

    function confirmRoute() {
      const r = OPS.confirmRoute(OPS.load(), selectedTrip);
      if (!r.ok) { alert('Chuyến không còn ở hàng đợi lập lộ trình.'); return; }
      window.location.href = 'OPS-08.html?trip=' + encodeURIComponent(selectedTrip);
    }

    renderRoute();
