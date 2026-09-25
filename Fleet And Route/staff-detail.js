    (function () {
      const id = new URLSearchParams(window.location.search).get('id');
      const state = OPS.load();
      const s = state.staff.find(x => x.id === id);
      if (!s) {
        document.getElementById('staff-title').textContent = 'Không tìm thấy nhân sự';
        document.getElementById('staff-trips').innerHTML =
          '<tr><td colspan="5" style="text-align:center;color:#94A3B8;">Mã nhân sự không hợp lệ.</td></tr>';
        return;
      }
      const roleLabel = s.role === 'driver' ? 'Tài xế' : 'Nhân viên hộ tống';
      document.getElementById('staff-title').textContent = `${s.name} (${s.id})`;
      document.getElementById('staff-info').innerHTML = `
        <div class="info-row"><span class="info-label">Vai trò:</span><span class="info-value">${roleLabel}</span></div>
        <div class="info-row"><span class="info-label">Điện thoại:</span><span class="info-value">${s.phone || '—'}</span></div>
        <div class="info-row"><span class="info-label">Ghi chú:</span><span class="info-value">${s.note || '—'}</span></div>`;
      const rows = [];
      state.trips.forEach(t => t.legs.forEach(l => {
        if (l.driverId === id || l.escortId === id) {
          rows.push(`<tr><td class="code">${t.id}</td><td>${t.route}</td><td>Chặng ${l.no}</td>
            <td>${l.from} → ${l.to}</td><td>${OPS.STATUS_LABEL[t.status]}</td></tr>`);
        }
      }));
      document.getElementById('staff-trips').innerHTML = rows.length ? rows.join('') :
        '<tr><td colspan="5" style="text-align:center;color:#94A3B8;">Chưa phân công chặng nào.</td></tr>';
    })();
