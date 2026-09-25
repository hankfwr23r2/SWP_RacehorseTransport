    let opsFilter = null; // lọc cảnh báo theo chuyến (bấm vào dòng chuyến)
    let showAllAlerts = false; // gồm cả sự cố đã trình Manager

    function renderMonitor() {
      const state = OPS.load();
      const running = OPS.queueFor(state, 'in_transit');
      const open = OPS.openIncidents(state);
      const emgTrips = new Set(open.filter(i => i.severity === 'emergency').map(i => i.tripId));
      const warnTrips = new Set(open.filter(i => i.severity !== 'emergency').map(i => i.tripId));
      document.getElementById('st-running').textContent = running.length;
      document.getElementById('st-ok').textContent = running.filter(t => !emgTrips.has(t.id) && !warnTrips.has(t.id)).length;
      document.getElementById('st-warn').textContent = warnTrips.size;
      document.getElementById('st-emg').textContent = emgTrips.size;
      document.getElementById('ops-trips').innerHTML = running.length ? running.map(t => {
        const firstLeg = t.legs[0] || {};
        const v = OPS.vehicleById(state, firstLeg.vehicleId);
        const badge = emgTrips.has(t.id) ? '<span class="badge badge-danger">Sự cố</span>'
          : warnTrips.has(t.id) ? '<span class="badge badge-warning">Cảnh cáo</span>'
          : '<span class="badge badge-success">Bình thường</span>';
        return `<tr onclick="filterTrip('${t.id}')" style="cursor:pointer;" title="Bấm để lọc cảnh báo chuyến này">
          <td class="code">#${t.id}</td>
          <td>${t.route}</td>
          <td>${v ? `${v.plate} (${OPS.staffName(state, firstLeg.driverId)})` : 'chưa gán xe'}</td>
          <td><span class="badge badge-info">${t.legs.length} chặng</span></td>
          <td>${t.depart}</td>
          <td>${t.depart}</td>
          <td>${badge}</td>
        </tr>`;
      }).join('') :
        '<tr><td colspan="7" style="text-align:center;color:#94A3B8;">Chưa có chuyến đang chạy. Khởi hành ở Phân công.</td></tr>';
      const list = showAllAlerts ? state.incidents : open;
      const visible = opsFilter ? list.filter(i => i.tripId === opsFilter) : list;
      const acts = opsFilter ? (state.activity || []).filter(a => a.text.includes(opsFilter)) : (state.activity || []);
      document.getElementById('ops-alerts').innerHTML =
        (visible.length ? visible.map(i => `
        <div class="alert-bar ${i.severity === 'emergency' ? 'alert-danger' : 'alert-warning'}">
          <div>
            <div>⚠ <strong>${i.time}</strong> — Chuyến #${i.tripId}: ${i.type} ${i.status === 'proposed' ? '<span class="badge badge-muted">Đã trình Manager</span>' : ''}</div>
            <div style="font-weight:400;font-size:12px;margin-top:4px;">${i.desc}</div>
            <div style="margin-top:8px;"><a class="action-link" href="OPS-04.html?incident=${i.id}">→ Chuyển sang Xử lý Sự cố</a></div>
          </div>
        </div>`).join('') : '') +
        (acts.map(a => `
        <div class="alert-bar alert-info">
          <div>
            <div>📸 <strong>${a.time}</strong> — ${a.text}</div>
          </div>
        </div>`).join('') || ((visible.length || acts.length) ? '' :
        '<div style="text-align:center;color:#94A3B8;font-size:13px;">Không có cảnh báo nào.</div>'));
      document.getElementById('alerts-toggle').textContent =
        (opsFilter ? `Đang lọc ${opsFilter} — bấm chuyến khác hoặc bấm đây để bỏ lọc ✕` : '') +
        (showAllAlerts ? 'Thu gọn cảnh báo ▴' : 'Xem tất cả cảnh báo ▸');
    }

    function filterTrip(tripId) {
      opsFilter = (opsFilter === tripId) ? null : tripId;
      renderMonitor();
      if (opsFilter) toast('Đang lọc cảnh báo chuyến ' + opsFilter);
    }

    function toggleAlerts() {
      if (opsFilter) { opsFilter = null; renderMonitor(); return; }
      showAllAlerts = !showAllAlerts;
      renderMonitor();
    }

    function uploadCheckpoint() {
      const leg = document.getElementById('checkpoint-leg').value;
      const state = OPS.load();
      OPS.logActivity(state, `Đã tải ảnh chặng: ${leg}`);
      toast('Đã ghi nhận ảnh chặng (demo, chưa upload thật)');
      renderMonitor();
    }

    renderMonitor();
