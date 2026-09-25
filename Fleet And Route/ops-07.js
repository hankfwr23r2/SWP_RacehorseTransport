    const VSTATUS = { available: ['Khả dụng', 'badge-success'], in_use: ['Đang sử dụng', 'badge-info'], maintenance: ['Đang bảo dưỡng', 'badge-warning'] };
    let editingId = null;

    function fmtDate(iso) {
      if (!iso) return '—';
      const p = iso.split('-');
      return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
    }

    function renderFleet() {
      const state = OPS.load();
      document.getElementById('vehicle-rows').innerHTML = state.vehicles.map(v => {
        const [label, badge] = VSTATUS[v.status] || [v.status, 'badge-muted'];
        return `<tr><td class="code">${v.id}</td><td>${v.name}</td><td>${v.type}</td><td>${v.capacity} ngăn</td>
          <td>${v.plate}</td><td>${OPS.staffName(state, v.driverId)}</td><td><span class="badge ${badge}">${label}</span></td><td>${fmtDate(v.maintenance)}</td>
          <td><a class="action-link" onclick="editVehicle('${v.id}')">Sửa</a> &nbsp;
          <a class="action-link" style="color:#DC2626;" onclick="deleteVehicle('${v.id}')">Xóa</a></td></tr>`;
      }).join('');
      renderEditor(state);
    }

    function renderEditor(state) {
      state = state || OPS.load();
      const v = editingId ? OPS.vehicleById(state, editingId) : null;
      const drivers = OPS.staffByRole(state, 'driver');
      document.getElementById('vehicle-detail').innerHTML = `
        <div class="card-title"><div class="icon"></div> ${v ? `Chi tiết Phương tiện — ${v.id}` : 'Thêm phương tiện mới'}</div>
        <div class="divider"></div>
        <div class="grid-3">
          <div class="form-group"><label class="form-label">Tên phương tiện</label><input class="form-input" id="v-name" value="${v ? v.name : ''}"></div>
          <div class="form-group"><label class="form-label">Loại phương tiện</label><select class="form-input" id="v-type">
            ${['Xe tải chuyên dụng', 'Container đặc biệt'].map(t => `<option ${v && v.type === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select></div>
          <div class="form-group"><label class="form-label">Sức chứa (ngăn)</label><input class="form-input" id="v-cap" type="number" min="1" value="${v ? v.capacity : 2}"></div>
        </div>
        <div class="grid-3">
          <div class="form-group"><label class="form-label">Biển số / Mã ID</label><input class="form-input" id="v-plate" value="${v ? v.plate : ''}"></div>
          <div class="form-group"><label class="form-label">Trạng thái</label><select class="form-input" id="v-status">
            ${Object.keys(VSTATUS).map(k => `<option value="${k}" ${v && v.status === k ? 'selected' : ''}>${VSTATUS[k][0]}</option>`).join('')}
          </select></div>
          <div class="form-group"><label class="form-label">Ngày bảo trì gần nhất</label><input class="form-input" id="v-maint" type="date" value="${v ? v.maintenance : ''}"></div>
        </div>
        <div class="form-group"><label class="form-label">Tài xế cố định của xe (1 tài xế ↔ 1 xe — chọn xe là gán tài xế theo)</label><select class="form-input" id="v-driver" style="max-width:320px;">
          <option value="">— Chưa gán —</option>
          ${drivers.map(d => `<option value="${d.id}" ${v && v.driverId === d.id ? 'selected' : ''}>${d.name} (${d.id})</option>`).join('')}
        </select></div>
        <div class="flex-end mt-16">
          <button class="btn btn-outline" onclick="editingId=null;renderFleet()">Hủy</button>
          <button class="btn btn-primary" onclick="saveVehicle()">Lưu thông tin</button>
        </div>`;
    }

    function newVehicle() {
      editingId = null;
      renderEditor();
      document.getElementById('v-name').focus();
    }

    function editVehicle(id) {
      editingId = id;
      renderEditor();
    }

    function deleteVehicle(id) {
      const state = OPS.load();
      const used = state.trips.some(t => t.status !== 'done' && t.legs.some(l => l.vehicleId === id));
      if (used && !confirm(`Xe ${id} đang gán cho chuyến chưa xong. Vẫn xóa?`)) return;
      state.vehicles = state.vehicles.filter(v => v.id !== id);
      if (editingId === id) editingId = null;
      OPS.save(state);
      renderFleet();
    }

    function saveVehicle() {
      const state = OPS.load();
      const data = {
        name: document.getElementById('v-name').value.trim(),
        type: document.getElementById('v-type').value,
        capacity: parseInt(document.getElementById('v-cap').value, 10) || 2,
        plate: document.getElementById('v-plate').value.trim(),
        status: document.getElementById('v-status').value,
        maintenance: document.getElementById('v-maint').value,
        driverId: document.getElementById('v-driver').value
      };
      if (!data.name || !data.plate) { alert('Nhập tên và biển số xe.'); return; }
      if (editingId) {
        Object.assign(OPS.vehicleById(state, editingId), data);
      } else {
        const n = state.vehicles.length + 1;
        state.vehicles.push({ id: 'VH-' + String(n).padStart(3, '0'), ...data });
      }
      editingId = null;
      OPS.save(state);
      renderFleet();
    }

    renderFleet();
