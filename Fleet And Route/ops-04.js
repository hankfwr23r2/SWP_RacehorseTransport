    const SEV_LABEL = { emergency: 'Khẩn cấp', medium: 'Trung bình', low: 'Thấp' };
    const SEV_BADGE = { emergency: 'badge-danger', medium: 'badge-warning', low: 'badge-success' };
    let selectedInc = new URLSearchParams(window.location.search).get('incident');

    function renderInc() {
      const state = OPS.load();
      const list = state.incidents;
      document.getElementById('inc-queue').innerHTML = list.map(i => `
        <tr>
          <td class="code">#${i.id}</td>
          <td>#${i.tripId}</td>
          <td><span class="badge badge-info">${i.leg}</span></td>
          <td>${i.time}</td>
          <td><span class="badge ${SEV_BADGE[i.severity]}">${SEV_LABEL[i.severity]}</span></td>
          <td>${i.type}</td>
          <td>${i.desc}</td>
          <td><a class="action-link" onclick="selectInc('${i.id}')">Xem & Đề xuất</a></td>
        </tr>`).join('');
      if (!selectedInc || !list.find(i => i.id === selectedInc)) {
        const firstOpen = list.find(i => i.status === 'open');
        selectedInc = firstOpen ? firstOpen.id : (list[0] && list[0].id);
      }
      const box = document.getElementById('inc-detail');
      if (!selectedInc) { box.innerHTML = ''; return; }
      const i = list.find(x => x.id === selectedInc);
      const t = OPS.findTrip(state, i.tripId);
      box.innerHTML = `
        <div class="alert-bar ${i.severity === 'emergency' ? 'alert-danger' : 'alert-warning'}">⚠ ${SEV_LABEL[i.severity].toUpperCase()} — #${i.id} | Chuyến #${i.tripId}${t ? ` (${t.route})` : ''} | Chặng ${i.leg}</div>
        <div class="grid-2" style="gap:32px;">
          <div>
            <div style="font-size:14px;font-weight:600;margin-bottom:12px;">Báo cáo từ Tài xế / Escort</div>
            <div class="info-row"><span class="info-label">Loại sự cố:</span><span class="info-value">${i.type}</span></div>
            <div class="info-row"><span class="info-label">Thời gian:</span><span class="info-value">${i.time}</span></div>
            <div class="info-row"><span class="info-label">Mô tả:</span><span class="info-value">${i.desc}</span></div>
            <div class="info-row"><span class="info-label">Trạng thái:</span><span class="info-value">${OPS.INCIDENT_STATUS_LABEL[i.status]}</span></div>
          </div>
          <div>
            <div style="font-size:14px;font-weight:600;margin-bottom:12px;">Đề xuất Phương án Xử lý</div>
            ${i.status === 'proposed' ? `<div class="info-row"><span class="info-label">Đã trình Manager:</span><span class="info-value">${i.proposal}</span></div>
              <div style="font-size:12px;color:#64748B;">Manager phê duyệt ở trang Phê duyệt Sự cố (đồng bộ sau).</div>` : `
            <div class="form-group"><label class="form-label">Mô tả chi tiết phương án:</label><textarea
                class="form-input" id="inc-proposal" rows="3"
                placeholder="VD: Điều xe thay thế, dự kiến tới trong 45 phút..."></textarea>
            </div>
            <div class="flex-end mt-16">
              <button class="btn btn-outline" onclick="renderInc()">Hủy bỏ</button>
              <button class="btn btn-primary" onclick="confirmPropose()">Trình Đề xuất lên Manager để Phê duyệt</button>
            </div>`}
          </div>
        </div>`;
    }

    function selectInc(id) {
      selectedInc = id;
      renderInc();
    }

    function confirmPropose() {
      const text = document.getElementById('inc-proposal').value;
      const r = OPS.proposeIncident(OPS.load(), selectedInc, text);
      if (!r.ok) { alert('Chưa nhập phương án hoặc sự cố đã được trình.'); return; }
      renderInc();
    }

    renderInc();
