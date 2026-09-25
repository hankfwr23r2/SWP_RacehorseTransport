    const params = new URLSearchParams(window.location.search);

    function assignableTrips(state) {
      return state.trips.filter(t => ['assigned', 'awaiting_routing', 'in_transit'].includes(t.status));
    }

    function renderAssign() {
      const state = OPS.load();
      const trips = assignableTrips(state);
      const sel = document.getElementById('assign-trip');
      const wanted = params.get('trip') || (sel.value || (trips[0] && trips[0].id));
      sel.innerHTML = trips.map(t =>
        `<option value="${t.id}" ${t.id === wanted ? 'selected' : ''}>${t.id} — ${t.route} (${OPS.STATUS_LABEL[t.status]})</option>`
      ).join('');
      const trip = OPS.findTrip(state, sel.value);
      if (!trip) return;
      document.getElementById('assign-trip-label').textContent = `${trip.id} (${trip.route})`;
      const escorts = OPS.staffByRole(state, 'escort');
      document.getElementById('assign-legs').innerHTML = trip.legs.map(l => {
        const v = OPS.vehicleById(state, l.vehicleId);
        return `
        <tr>
          <td class="code">Chặng ${l.no}</td>
          <td>${l.from} → ${l.to}</td>
          <td><select class="form-input" onchange="setVehicle(${l.no},this.value)">
            <option value="">— Chọn xe —</option>
            ${state.vehicles.map(x => `<option value="${x.id}" ${x.id === l.vehicleId ? 'selected' : ''}>${x.id} — ${x.name} (${x.plate})</option>`).join('')}
          </select>
          ${v ? `<div style="margin-top:4px;font-size:12px;color:#64748B;">Tài xế cố định: ${OPS.staffName(state, v.driverId)}</div>` : ''}</td>
          <td><span class="badge badge-info">${OPS.staffName(state, l.driverId) === '—' ? 'Tự gán theo xe' : OPS.staffName(state, l.driverId)}</span>
          ${l.driverId ? `<div style="margin-top:4px;"><a class="action-link" href="chi-tiet-nhan-su.html?id=${l.driverId}">Chi tiết</a></div>` : ''}</td>
          <td><select class="form-input" onchange="setEscort(${l.no},this.value)" title="Hệ thống tự gán người rảnh nhất, điều phối được đổi tay">
            <option value="">— Tự động —</option>
            ${escorts.map(e => `<option value="${e.id}" ${e.id === l.escortId ? 'selected' : ''}>${e.name}</option>`).join('')}
          </select>
          ${l.escortId ? `<div style="margin-top:4px;"><a class="action-link" href="chi-tiet-nhan-su.html?id=${l.escortId}">Chi tiết</a></div>` : ''}</td>
        </tr>`;
      }).join('');
      const st = document.getElementById('assign-status');
      const btn = document.getElementById('depart-btn');
      if (trip.status === 'in_transit' || trip.status === 'done') {
        st.innerHTML = `<span class="badge badge-success">${OPS.STATUS_LABEL[trip.status]} — theo dõi ở Giám sát</span>`;
        btn.style.display = 'none';
      } else if (trip.status !== 'assigned') {
        st.innerHTML = `<span class="badge badge-info">${OPS.STATUS_LABEL[trip.status]} — chốt lộ trình ở OPS-05 trước khi phân công khởi hành</span>`;
        btn.style.display = 'none';
      } else if (OPS.assignmentComplete(trip)) {
        st.innerHTML = `<span class="badge badge-success">Đã đủ xe các chặng (tài xế + hộ tống tự gán) — sẵn sàng khởi hành</span>`;
        btn.style.display = '';
      } else {
        st.innerHTML = `<span class="badge badge-warning">Còn chặng chưa chọn xe</span>`;
        btn.style.display = 'none';
      }
    }

    function setVehicle(legNo, vehicleId) {
      const tripId = document.getElementById('assign-trip').value;
      const r = OPS.assignVehicle(OPS.load(), tripId, legNo, vehicleId);
      if (!r.ok) alert('Chuyến không ở trạng thái phân công được.');
      renderAssign();
    }

    function setEscort(legNo, escortId) {
      const tripId = document.getElementById('assign-trip').value;
      OPS.assignLeg(OPS.load(), tripId, legNo, undefined, escortId || undefined, undefined);
      if (!escortId) {
        // Về chế độ tự động: gán lại người rảnh nhất
        const state = OPS.load();
        const t = OPS.findTrip(state, tripId);
        const leg = t && t.legs.find(l => l.no === legNo);
        if (leg && leg.vehicleId) OPS.assignVehicle(state, tripId, legNo, leg.vehicleId);
      }
      renderAssign();
    }

    function confirmDepart() {
      const tripId = document.getElementById('assign-trip').value;
      const r = OPS.departTrip(OPS.load(), tripId);
      if (!r.ok) { alert('Chưa khởi hành được: thiếu phân công hoặc sai trạng thái.'); return; }
      window.location.href = 'OPS-06.html';
    }

    renderAssign();
