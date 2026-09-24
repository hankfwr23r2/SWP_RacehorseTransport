/**
 * create_request.js - Module Xử lý Tạo Yêu cầu Vận chuyển Ngựa (CUS)
 * Đồng bộ logic chọn Quốc gia -> Hiển thị kho/điểm đến tương ứng,
 * Tự động phát hiện tuyến Nội địa / Quốc tế,
 * Quản lý thông tin cá thể ngựa, tính phí bảo hiểm và đồng bộ dữ liệu sang Bước 4.
 */

// ==========================================
// 1. DỮ LIỆU ĐIỂM ĐI / ĐIỂM ĐẾN THEO QUỐC GIA
// ==========================================
const COUNTRY_LOCATIONS = {
    'VN': [
        { id: 'KHO-DN', name: 'Kho Đồng Nai — Trang trại Đua ngựa Long Thành', type: 'farm' },
        { id: 'KHO-LA', name: 'Kho Long An — Trang trại Huấn luyện Mỹ Quỳnh (Đức Hòa)', type: 'farm' },
        { id: 'KHO-BD', name: 'Kho Bình Dương — Trung tâm Cưỡi ngựa Đức Hòa', type: 'farm' },
        { id: 'CLB-SG', name: 'CLB Cưỡi ngựa Sài Gòn (Saigon Pony Club - Q.2, TP.HCM)', type: 'club' }
    ],
    'KH': [
        { id: 'KHO-PNH', name: 'Kho Phnom Penh — Trung tâm Kiểm dịch Động vật Phnom Penh', type: 'farm' },
        { id: 'KHO-SR', name: 'Kho Siem Reap — Trại Ngựa & Vật nuôi Angkor', type: 'farm' },
        { id: 'SAI-PNH', name: 'CLB Cưỡi ngựa Hoàng gia Phnom Penh (Phnom Penh Equestrian Club)', type: 'club' }
    ],
    'LA': [
        { id: 'KHO-VTE', name: 'Kho Viêng Chăn — Trang trại Chăn nuôi & Kiểm dịch Vientiane', type: 'farm' },
        { id: 'CLB-VTE', name: 'CLB Mã cầu & Cưỡi ngựa Viêng Chăn (Vientiane Equestrian Club)', type: 'club' }
    ]
};

// ==========================================
// 2. HÀM TẠO VÀ ĐỔ DỮ LIỆU ĐIỂM ĐẾN / KHO
// ==========================================

/**
 * Đổ danh sách kho/điểm đến vào thẻ <select> dựa trên quốc gia đã chọn
 * @param {string} selectId - ID của thẻ select vị trí (origin_location hoặc dest_location)
 * @param {string} countryCode - Mã quốc gia (VN, KH, LA)
 * @param {string} selectedId - ID vị trí mặc định muốn chọn
 */
function populateLocations(selectId, countryCode, selectedId = null) {
    const selectElem = document.getElementById(selectId);
    if (!selectElem) return;

    // Xóa dữ liệu cũ
    selectElem.innerHTML = '';

    // Nếu chưa chọn quốc gia
    if (!countryCode) {
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Vui lòng chọn quốc gia trước';
        defaultOpt.selected = true;
        defaultOpt.disabled = true;

        selectElem.appendChild(defaultOpt);

        // Khóa ô chọn địa điểm
        selectElem.disabled = true;

        return;
    }

    // Đã chọn quốc gia -> mở ô chọn địa điểm
    selectElem.disabled = false;

    const locations = COUNTRY_LOCATIONS[countryCode] || [];

    // Nếu quốc gia không có dữ liệu
    if (locations.length === 0) {
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = '— Không có dữ liệu địa điểm —';
        defaultOpt.selected = true;

        selectElem.appendChild(defaultOpt);
        return;
    }

    // Placeholder sau khi đã chọn quốc gia
    const placeholderOpt = document.createElement('option');

    placeholderOpt.value = '';
    placeholderOpt.textContent =
        selectId === 'origin_location'
            ? '— Chọn điểm xuất phát —'
            : '— Chọn điểm đến nhận ngựa —';

    placeholderOpt.selected = true;
    placeholderOpt.disabled = true;

    selectElem.appendChild(placeholderOpt);

    // Thêm danh sách địa điểm
    locations.forEach(loc => {
        const opt = document.createElement('option');

        opt.value = loc.id;
        opt.textContent = loc.name;

        if (selectedId && loc.id === selectedId) {
            opt.selected = true;
        }

        selectElem.appendChild(opt);
    });
}

/**
 * Cập nhật danh sách điểm đón khi đổi Quốc gia Xuất phát
 */
function updateOriginLocations(selectedLocationId = null) {
    const originCountry =
        document.getElementById('origin_country')?.value || '';

    populateLocations(
        'origin_location',
        originCountry,
        selectedLocationId
    );

    detectTransportType();
}

/**
 * Cập nhật danh sách điểm giao khi đổi Quốc gia Đến
 */
function updateDestLocations(selectedLocationId = null) {
    const destCountry =
        document.getElementById('dest_country')?.value || '';

    populateLocations(
        'dest_location',
        destCountry,
        selectedLocationId
    );

    detectTransportType();
}

/**
 * Tự động phát hiện phương thức Vận chuyển (Nội địa vs Quốc tế)
 */
function detectTransportType() {
    const originCountry = document.getElementById('origin_country')?.value;
    const destCountry = document.getElementById('dest_country')?.value;
    const badge = document.getElementById('route-badge-container');

    if (!badge || !originCountry || !destCountry) return;

    if (originCountry === destCountry && originCountry === 'VN') {
        badge.className = 'alert-box alert-info';
        badge.innerHTML = `
            <i class="fa-solid fa-truck" style="color: #1d4ed8; font-size: 1.3rem; margin-top: 2px;"></i>
            <div>
                <strong style="color: #1e40af;">Vận chuyển Nội địa:</strong> Tuyến đường bộ nội địa sử dụng đội xe tải chuyên dụng có điều hòa ổn nhiệt, đệm sàn chống sốc khí nén, hệ thống camera giám sát trực tiếp 24/7 và bác sĩ thú y theo dõi suốt hành trình.
            </div>
        `;
    } else {
        const originName = getCountryName(originCountry);
        const destName = getCountryName(destCountry);
        badge.className = 'alert-box alert-warning';
        badge.innerHTML = `
            <i class="fa-solid fa-truck text-orange" style="font-size: 1.3rem; margin-top: 2px;"></i>
            <div>
                <strong style="color: #9a3412;">Vận chuyển Quốc tế (${originName} &rarr; ${destName}):</strong> Tuyến đường yêu cầu kiểm dịch xuất/nhập cảnh thú y chuẩn OIE và thông quan tại cửa khẩu đường bộ, vận chuyển bằng xe tải chuyên dụng xuyên biên giới.
            </div>
        `;
    }
}

function getCountryName(code) {
    const map = {
        'VN': 'Việt Nam',
        'KH': 'Campuchia',
        'LA': 'Lào'
    };
    return map[code] || code;
}

// ==========================================
// 3. QUẢN LÝ DỮ LIỆU & STORAGE GIỮA CÁC BƯỚC
// ==========================================

const STORAGE_KEY = 'SWP_RACEHORSE_TRANSPORT_REQUEST';

function getStoredRequest() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : getDefaultRequestData();
    } catch (e) {
        return getDefaultRequestData();
    }
}

function saveRequestData(partialData) {
    try {
        const current = getStoredRequest();
        const merged = { ...current, ...partialData };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
    } catch (e) {
        console.warn('Cannot save to sessionStorage', e);
    }
}

function getDefaultRequestData() {
    return {
        // Bước 1
        originCountry: '',
        originLocation: '',
        originLocationName: '',

        destCountry: '',
        destLocation: '',
        destLocationName: '',

        isInternational: false,

        departureDate: '',
        quantity: '',

        urgency: '',

        // Bước 2
        horses: [],

        // Bước 3
        hasDisease: '',
        hasMedication: '',
        diseaseDetail: '',
        needIsolation: '',
        feeding: '',
        foodType: '',
        foodTypeName: '',
        stallType: '',
        stallTypeName: '',
        waterSupplement: '',
        waterSupplementName: '',
        insurance: '',
        insuranceName: '',
        horseValue: '',
        specialCare: ''
    };
}

// ==========================================
// 4. KHỞI TẠO BƯỚC 1 (Tuyến đường)
// ==========================================
function initStep1() {
    const originCountrySelect = document.getElementById('origin_country');
    const destCountrySelect = document.getElementById('dest_country');
    const form = document.querySelector('form[action="create_request_step2.html"]');

    if (!originCountrySelect || !destCountrySelect) return;

    const data = getStoredRequest();

    // Set initial values only if user has already entered data
    if (data.originCountry) {
        originCountrySelect.value = data.originCountry;
    }

    if (data.destCountry) {
        destCountrySelect.value = data.destCountry;
    }

    if (data.departureDate && document.getElementById('date')) {
        document.getElementById('date').value = data.departureDate;
    }

    if (data.quantity && document.getElementById('quantity')) {
        document.getElementById('quantity').value = data.quantity;
    }

    if (data.urgency && document.getElementById('urgency')) {
        document.getElementById('urgency').value = data.urgency;
    }

    // Chỉ load danh sách địa điểm nếu người dùng đã chọn quốc gia
    // Load điểm xuất phát
    if (data.originCountry) {
        updateOriginLocations(data.originLocation || null);
    } else {
        populateLocations('origin_location', '');
    }

    // Load điểm đến
    if (data.destCountry) {
        updateDestLocations(data.destLocation || null);
    } else {
        populateLocations('dest_location', '');
    }

    // Form submit listener
    if (form) {
        form.addEventListener('submit', function (e) {
            const originLocElem = document.getElementById('origin_location');
            const destLocElem = document.getElementById('dest_location');
            const originLocText = originLocElem?.options[originLocElem.selectedIndex]?.text || '';
            const destLocText = destLocElem?.options[destLocElem.selectedIndex]?.text || '';

            saveRequestData({
                originCountry: originCountrySelect.value,
                originLocation: originLocElem?.value,
                originLocationName: originLocText,
                destCountry: destCountrySelect.value,
                destLocation: destLocElem?.value,
                destLocationName: destLocText,
                isInternational: originCountrySelect.value !== destCountrySelect.value,
                departureDate: document.getElementById('date')?.value || '2026-11-15',
                quantity: parseInt(document.getElementById('quantity')?.value, 10) || 0,
                urgency: document.getElementById('urgency')?.value || 'standard'
            });
        });
    }
}

// ==========================================
// 5. KHỞI TẠO BƯỚC 2 (THÔNG TIN NGỰA)
// ==========================================

let currentHorseId = 1;


/**
 * Tạo danh sách các cá thể ngựa dựa trên
 * số lượng khách đã chọn ở Bước 1.
 */
function initializeHorseList(quantity, existingHorses = []) {

    const horses = [];

    for (let i = 1; i <= quantity; i++) {

        // Tìm dữ liệu cũ nếu đã tồn tại
        const existingHorse = existingHorses.find(
            horse => Number(horse.id) === i
        );

        horses.push(
            existingHorse || {
                id: i,
                name: '',
                microchip: '',
                breed: '',
                gender: '',
                age: '',
                weight: '',
                color: '',
                marks: '',
                completed: false
            }
        );
    }

    return horses;
}


/**
 * Tạo menu dropdown Ngựa #1 -> Ngựa #N
 */
function renderHorseSelector(horses) {

    const selector =
        document.getElementById('horse_selector');

    if (!selector) return;

    selector.innerHTML = '';

    horses.forEach(horse => {

        const option =
            document.createElement('option');

        option.value = horse.id;

        const horseNumber =
            String(horse.id).padStart(2, '0');

        const horseName =
            horse.name
                ? ` — ${horse.name}`
                : ' — Chưa khai báo';

        const status =
            horse.completed
                ? ' ✓'
                : '';

        option.textContent =
            `Ngựa #${horseNumber}${horseName}${status}`;

        option.dataset.completed =
            horse.completed ? 'true' : 'false';

        selector.appendChild(option);
    });

    selector.value = currentHorseId;
}


/**
 * Load dữ liệu của một con ngựa vào form
 */
function loadHorseToForm(horse) {

    if (!horse) return;

    const nameInput = document.getElementById('horse_name_1');
    const microchipInput = document.getElementById('microchip_1');
    const breedSelect = document.getElementById('breed_1');
    const genderSelect = document.getElementById('gender_1');
    const ageInput = document.getElementById('age_1');
    const weightInput = document.getElementById('weight_1');
    const colorSelect = document.getElementById('color_1');
    const marksInput = document.getElementById('marks_1');

    // -----------------------------
    // Name
    // -----------------------------
    if (nameInput) {
        nameInput.value = horse.name || '';
    }

    // -----------------------------
    // Microchip
    // -----------------------------
    if (microchipInput) {
        microchipInput.value = horse.microchip || '';
    }

    // -----------------------------
    // Breed
    // -----------------------------
    if (breedSelect) {

        if (horse.breedValue) {
            breedSelect.value = horse.breedValue;
        } else {
            setSelectByText(
                breedSelect,
                horse.breed
            );
        }
    }

    // -----------------------------
    // Gender
    // -----------------------------
    if (genderSelect) {

        if (horse.genderValue) {
            genderSelect.value = horse.genderValue;
        } else {
            setSelectByText(
                genderSelect,
                horse.gender
            );
        }
    }

    // -----------------------------
    // Age
    // -----------------------------
    if (ageInput) {
        ageInput.value = horse.age || '';
    }

    // -----------------------------
    // Weight
    // -----------------------------
    if (weightInput) {
        weightInput.value = horse.weight || '';
    }

    // -----------------------------
    // Color
    // -----------------------------
    if (colorSelect) {

        if (horse.colorValue) {
            colorSelect.value = horse.colorValue;
        } else {
            setSelectByText(
                colorSelect,
                horse.color
            );
        }
    }

    // -----------------------------
    // Marks
    // -----------------------------
    if (marksInput) {
        marksInput.value = horse.marks || '';
    }

    updateHorseCardTitle(horse);
}


/**
 * Chọn option của select dựa vào text
 */
function setSelectByText(selectElement, text) {

    if (!selectElement || !text) return;

    const option = Array.from(
        selectElement.options
    ).find(
        opt => opt.text === text
    );

    if (option) {
        selectElement.value = option.value;
    }
}


/**
 * Lấy dữ liệu hiện tại trên form
 */
function collectCurrentHorse() {

    const breedSelect =
        document.getElementById('breed_1');

    const genderSelect =
        document.getElementById('gender_1');

    const colorSelect =
        document.getElementById('color_1');

    const name =
        document.getElementById('horse_name_1')?.value.trim() || '';

    const microchip =
        document.getElementById('microchip_1')?.value.trim() || '';

    const breed =
        breedSelect
            ? breedSelect.options[breedSelect.selectedIndex]?.text || ''
            : '';

    const gender =
        genderSelect
            ? genderSelect.options[genderSelect.selectedIndex]?.text || ''
            : '';

    const color =
        colorSelect
            ? colorSelect.options[colorSelect.selectedIndex]?.text || ''
            : '';

    const horse = {

        id: currentHorseId,

        name: name,

        microchip: microchip,

        breed: breed,

        breedValue: breedSelect?.value || '',

        gender: gender,

        genderValue: genderSelect?.value || '',

        age:
            document.getElementById('age_1')?.value || '',

        weight:
            document.getElementById('weight_1')?.value || '',

        color: color,

        colorValue: colorSelect?.value || '',

        marks:
            document.getElementById('marks_1')?.value.trim() || '',

        completed:
            !!(
                name &&
                microchip &&
                breedSelect?.value &&
                genderSelect?.value &&
                document.getElementById('weight_1')?.value &&
                colorSelect?.value
            )
    };

    return horse;
}


/**
 * Lưu dữ liệu ngựa hiện tại
 */
function saveCurrentHorse() {

    const data = getStoredRequest();

    let horses = data.horses || [];

    const horse = collectCurrentHorse();

    const index = horses.findIndex(
        h => Number(h.id) === currentHorseId
    );

    if (index >= 0) {
        horses[index] = horse;
    } else {
        horses.push(horse);
    }

    horses.sort(
        (a, b) => Number(a.id) - Number(b.id)
    );

    saveRequestData({
        horses: horses
    });

    return horses;
}


/**
 * Chuyển sang một con ngựa khác
 */
function switchHorse(horseId) {

    // Lưu con hiện tại trước
    saveCurrentHorse();

    currentHorseId = Number(horseId);

    const data = getStoredRequest();

    const horses = data.horses || [];

    let horse = horses.find(
        h => Number(h.id) === currentHorseId
    );

    if (!horse) {

        horse = {
            id: currentHorseId,
            name: '',
            microchip: '',
            breed: '',
            gender: '',
            age: '',
            weight: '',
            color: '',
            marks: '',
            completed: false
        };
    }

    loadHorseToForm(horse);

    updateHorseProgress(
        horses,
        data.quantity || horses.length || 1
    );
}


/**
 * Cập nhật tiêu đề card
 */
function updateHorseCardTitle(horse) {

    const title =
        document.getElementById('horse-card-title');

    if (!title) return;

    const horseName =
        horse.name
            ? ` — ${horse.name}`
            : '';

    title.innerHTML = `
        <i class="fa-solid fa-horse-head text-orange"></i>
        Cá thể Ngựa #${horse.id}${horseName} — Thông tin Nhận dạng
    `;
}


/**
 * Cập nhật tiến độ:
 * Đã khai báo X / Tổng số ngựa
 */
function updateHorseProgress(horses, total) {

    const progress =
        document.getElementById('horse-progress');

    if (!progress) return;

    const completedCount =
        horses.filter(
            horse => horse.completed
        ).length;

    progress.textContent =
        `Đã khai báo ${completedCount} / ${total}`;
}


// ==========================================
// DỮ LIỆU DEMO CÁC CÁ THỂ NGỰA
// Dùng để minh họa giao diện Step 2
// ==========================================

const DEMO_HORSES = [
    {
        id: 1,
        name: 'Storm Runner',
        microchip: '#VN-985211',
        breed: 'Thoroughbred (Anh)',
        breedValue: 'thoroughbred',
        gender: 'Thiến (Gelding)',
        genderValue: 'gelding',
        age: '5',
        weight: '520',
        color: 'Nâu đỏ (Bay)',
        colorValue: 'bay',
        marks: 'Sao trắng trán, tất trắng chân sau',
        completed: true
    },

    {
        id: 2,
        name: 'Silver Arrow',
        microchip: '#VN-985212',
        breed: 'Arabian (Ả Rập)',
        breedValue: 'arabian',
        gender: 'Đực (Stallion)',
        genderValue: 'stallion',
        age: '7',
        weight: '480',
        color: 'Xám tro (Grey)',
        colorValue: 'grey',
        marks: 'Đốm trắng nhỏ trên mũi',
        completed: true
    },

    {
        id: 3,
        name: 'Golden Wind',
        microchip: '#VN-985213',
        breed: 'Warmblood',
        breedValue: 'warmblood',
        gender: 'Cái (Mare)',
        genderValue: 'mare',
        age: '6',
        weight: '550',
        color: 'Vàng kim (Palomino)',
        colorValue: 'palomino',
        marks: 'Vệt trắng dài giữa trán',
        completed: true
    }
];

const DEMO_MODE = true;

/**
 * Khởi tạo Step 2
 */
function initStep2() {

    const form =
        document.querySelector(
            'form[action="create_request_step3.html"]'
        );

    if (!form) return;

    const data = getStoredRequest();

    // ------------------------------------------
    // Số lượng ngựa từ Bước 1
    // ------------------------------------------

    const quantity = DEMO_MODE
        ? 3
        : Math.max(
            1,
            Number(data.quantity) || 1
        );

    // ------------------------------------------
    // Tạo danh sách ngựa
    // ------------------------------------------

    let horses;

    if (DEMO_MODE) {

        horses = DEMO_HORSES.slice(0, quantity);

    } else {

        horses = initializeHorseList(
            quantity,
            data.horses || []
        );
    }

    // Lưu danh sách ban đầu
    saveRequestData({
        horses: horses,
        quantity: quantity
    });

    // ------------------------------------------
    // Render dropdown
    // ------------------------------------------

    currentHorseId = 1;

    renderHorseSelector(horses);

    // ------------------------------------------
    // Load ngựa đầu tiên
    // ------------------------------------------

    const firstHorse =
        horses.find(
            horse => Number(horse.id) === 1
        );

    if (firstHorse) {
        loadHorseToForm(firstHorse);
    }

    updateHorseProgress(
        horses,
        quantity
    );

    // ------------------------------------------
    // Khi khách chọn ngựa khác
    // ------------------------------------------

    const selector =
        document.getElementById('horse_selector');

    if (selector) {

        selector.addEventListener(
            'change',
            function () {

                switchHorse(
                    this.value
                );

                // Render lại option để cập nhật tên
                const latestData =
                    getStoredRequest();

                renderHorseSelector(
                    latestData.horses || []
                );

                selector.value =
                    currentHorseId;
            }
        );
    }

    // ------------------------------------------
    // Submit Step 2
    // ------------------------------------------

    form.addEventListener(
        'submit',
        function (e) {

            // Lưu con đang mở
            saveCurrentHorse();

            const latestData =
                getStoredRequest();

            const latestHorses =
                latestData.horses || [];

            // --------------------------------------
            // Kiểm tra đã nhập đủ tất cả ngựa chưa
            // --------------------------------------

            const incompleteHorses =
                latestHorses.filter(
                    horse => !horse.completed
                );

            if (incompleteHorses.length > 0) {

                e.preventDefault();

                const firstIncomplete =
                    incompleteHorses[0];

                alert(
                    `Vui lòng hoàn thành thông tin Ngựa #${firstIncomplete.id} trước khi tiếp tục.`
                );

                // Chuyển tới con ngựa chưa hoàn thành
                currentHorseId =
                    Number(firstIncomplete.id);

                renderHorseSelector(
                    latestHorses
                );

                const selector =
                    document.getElementById(
                        'horse_selector'
                    );

                if (selector) {
                    selector.value =
                        currentHorseId;
                }

                loadHorseToForm(
                    firstIncomplete
                );

                updateHorseProgress(
                    latestHorses,
                    quantity
                );

                return;
            }

            // --------------------------------------
            // Đủ thông tin
            // --------------------------------------

            saveRequestData({
                horses: latestHorses,
                quantity: latestHorses.length
            });
        }
    );
}

// ==========================================
// 6. KHỞI TẠO BƯỚC 3 (Dịch vụ & Y tế)
// ==========================================
function initStep3() {
    const form = document.querySelector('form[action="create_request_step4.html"]');
    if (!form) return;

    // Trigger initial calculation
    calculateInsurance();

    form.addEventListener('submit', function (e) {
        const foodTypeSelect = document.getElementById('food_type');
        const stallTypeSelect = document.getElementById('stall_type');
        const waterSelect = document.getElementById('water_supplement');
        const insuranceSelect = document.getElementById('insurance');
        const horseValStr = document.getElementById('horse_value')?.value.replace(/\D/g, '') || '2000000000';

        saveRequestData({
            hasDisease: document.getElementById('has_disease')?.value || 'no',
            hasMedication: document.getElementById('has_medication')?.value || 'no',
            diseaseDetail: document.getElementById('disease_detail')?.value || '',
            needIsolation: document.getElementById('need_isolation')?.value || 'no',
            feeding: document.getElementById('feeding')?.value || 'yes',
            foodType: foodTypeSelect?.value || 'hay',
            foodTypeName: foodTypeSelect ? foodTypeSelect.options[foodTypeSelect.selectedIndex].text : 'Cỏ khô Timothy Hay',
            stallType: stallTypeSelect?.value || 'standard',
            stallTypeName: stallTypeSelect ? stallTypeSelect.options[stallTypeSelect.selectedIndex].text : 'Khoang Tiêu chuẩn (1.2m × 2.4m)',
            waterSupplement: waterSelect?.value || 'normal',
            waterSupplementName: waterSelect ? waterSelect.options[waterSelect.selectedIndex].text : 'Nước sạch tiêu chuẩn',
            insurance: insuranceSelect?.value || 'basic',
            insuranceName: insuranceSelect ? insuranceSelect.options[insuranceSelect.selectedIndex].text : 'Gói Cơ bản (2%)',
            horseValue: parseInt(horseValStr, 10) || 2000000000,
            specialCare: document.getElementById('special_care')?.value || ''
        });
    });
}

function calculateInsurance() {
    const typeElem = document.getElementById('insurance');
    const valElem = document.getElementById('horse_value');
    const display = document.getElementById('insurance_display');
    if (!typeElem || !valElem || !display) return;

    const type = typeElem.value;
    const valStr = valElem.value.replace(/,/g, '').replace(/\D/g, '');
    const val = parseFloat(valStr) || 0;

    let rate = 0;
    if (type === 'basic') rate = 0.02;
    else if (type === 'premium') rate = 0.035;
    else if (type === 'full') rate = 0.05;

    if (rate === 0) {
        display.innerHTML = '<i class="fa-solid fa-info-circle" style="margin-right: 8px;"></i> 0 VND (Không đăng ký gói bảo hiểm)';
        display.style.color = '#64748b';
        display.style.background = '#f1f5f9';
        display.style.borderColor = '#cbd5e1';
    } else {
        const fee = val * rate;
        display.innerHTML = `<i class="fa-solid fa-calculator" style="margin-right: 8px; color: #059669;"></i> ${fee.toLocaleString('vi-VN')} VND (${(rate * 100).toFixed(1)}% × ${val.toLocaleString('vi-VN')} VND)`;
        display.style.color = '#059669';
        display.style.background = '#ecfdf5';
        display.style.borderColor = '#a7f3d0';
    }
}

// ==========================================
// 7. KHỞI TẠO BƯỚC 4 (Xác nhận & Bảng Dự toán)
// ==========================================
function initStep4() {
    const data = getStoredRequest();

    // Điểm xuất phát & đến
    const originCountryName = getCountryName(data.originCountry);
    const destCountryName = getCountryName(data.destCountry);
    const isDomestic = data.originCountry === data.destCountry && data.originCountry === 'VN';

    // Cập nhật thẻ tóm tắt 1: Tuyến đường
    const routeReviewGrid = document.querySelector('.card:nth-of-type(1) .review-grid');
    if (routeReviewGrid) {
        routeReviewGrid.innerHTML = `
            <div class="review-item">
                <div class="review-label">Quốc gia Xuất phát</div>
                <div class="review-value">${data.originCountry === 'VN' ? '🇻🇳' : '🌐'} ${originCountryName}</div>
            </div>
            <div class="review-item">
                <div class="review-label">Kho / Điểm xuất phát</div>
                <div class="review-value font-semibold">${data.originLocationName || data.originLocation}</div>
            </div>
            <div class="review-item">
                <div class="review-label">Quốc gia Đích đến</div>
                <div class="review-value">${data.destCountry === 'VN' ? '🇻🇳' : '🌐'} ${destCountryName}</div>
            </div>
            <div class="review-item">
                <div class="review-label">Điểm đến nhận ngựa</div>
                <div class="review-value font-semibold">${data.destLocationName || data.destLocation}</div>
            </div>
            <div class="review-item">
                <div class="review-label">Phương thức vận chuyển</div>
                <div class="review-value">${isDomestic ? 'Nội địa — Đội xe tải chuyên dụng kiểm soát nhiệt độ & chống sốc' : 'Xuyên quốc gia — Xe tải chuyên dụng đường bộ qua cửa khẩu'}</div>
            </div>
            <div class="review-item">
                <div class="review-label">Ngày khởi hành dự kiến</div>
                <div class="review-value">${formatDateVN(data.departureDate)} (${data.urgency === 'urgent' ? 'Hỏa tốc' : data.urgency === 'priority' ? 'Ưu tiên' : 'Tiêu chuẩn'})</div>
            </div>
        `;
    }

    // Cập nhật thẻ tóm tắt 2: Ngựa
    const horseReviewGrid = document.querySelector('.card:nth-of-type(2) .review-grid');
    if (horseReviewGrid && data.horses && data.horses.length > 0) {
        let html = '';
        data.horses.forEach((h, idx) => {
            html += `
                <div class="review-item">
                    <div class="review-label">Tên cá thể ngựa #${h.id}</div>
                    <div class="review-value font-bold">${h.name}</div>
                </div>
                <div class="review-item">
                    <div class="review-label">Mã Vi chip Microchip ID</div>
                    <div class="review-value font-bold text-orange">${h.microchip}</div>
                </div>
                <div class="review-item">
                    <div class="review-label">Giống ngựa / Giới tính</div>
                    <div class="review-value">${h.breed} | ${h.gender}</div>
                </div>
                <div class="review-item">
                    <div class="review-label">Độ tuổi / Thể trọng</div>
                    <div class="review-value">${h.age} tuổi | ${h.weight} kg</div>
                </div>
                <div class="review-item">
                    <div class="review-label">Màu lông & Đặc điểm</div>
                    <div class="review-value">${h.color}${h.marks ? ' — ' + h.marks : ''}</div>
                </div>
                <div class="review-item">
                    <div class="review-label">Hình ảnh nhận dạng</div>
                    <div class="review-value"><span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> Đã đính kèm ảnh</span></div>
                </div>
            `;
        });
        horseReviewGrid.innerHTML = html;
    }

    // Cập nhật bảng chi phí động
    recalculateStep4Quotation(data);
}

function recalculateStep4Quotation(data) {

    // ==========================================
    // 1. XÁC ĐỊNH LOẠI TUYẾN
    // ==========================================
    const isDomestic =
        data.originCountry === data.destCountry &&
        data.originCountry === 'VN';

    // ==========================================
    // 2. XÁC ĐỊNH SỐ LƯỢNG NGỰA
    // ==========================================
    // Không được chỉ kiểm tra data.horses,
    // vì [] vẫn là truthy.
    const horseCount =
        Array.isArray(data.horses) && data.horses.length > 0
            ? data.horses.length
            : Number(data.quantity) || 1;

    const quantity = Math.max(1, horseCount);

    // ==========================================
    // 3. TÍNH CƯỚC VẬN CHUYỂN
    // ==========================================
    let baseFreight;

    if (isDomestic) {
        baseFreight = 25_000_000 * quantity;
    } else {
        baseFreight = 120_000_000 * quantity;
    }

    // ==========================================
    // 4. PHÍ KIỂM DỊCH
    // ==========================================
    let quarantineFee;

    if (isDomestic) {
        quarantineFee = 3_000_000 * quantity;
    } else {
        quarantineFee = 15_000_000 * quantity;
    }

    // ==========================================
    // 5. PHÍ THỨC ĂN
    // 500.000/ngày × 3 ngày × số ngựa
    // ==========================================
    const feedFee =
        500_000 * 3 * quantity;

    // ==========================================
    // 6. PHÍ KHOANG VẬN CHUYỂN
    // ==========================================
    const stallFee =
        data.stallType === 'vip'
            ? 12_000_000 * quantity
            : 0;

    // ==========================================
    // 7. PHÍ BẢO HIỂM
    // ==========================================
    let insuranceRate = 0;

    if (data.insurance === 'basic') {
        insuranceRate = 0.02;
    } else if (data.insurance === 'premium') {
        insuranceRate = 0.035;
    } else if (data.insurance === 'full') {
        insuranceRate = 0.05;
    }

    const horseValue =
        Number(data.horseValue) || 2_000_000_000;

    const insuranceFee =
        horseValue * insuranceRate;

    // ==========================================
    // 8. PHÍ CHUYÊN VIÊN HỘ TỐNG
    // ==========================================
    const escortFee = 8_500_000;

    // ==========================================
    // 9. CÁCH LY
    // ==========================================
    if (data.needIsolation === 'yes') {
        baseFreight += 10_000_000;
    }

    // ==========================================
    // 10. TỔNG CHI PHÍ
    // ==========================================
    const totalCost =
        baseFreight +
        quarantineFee +
        feedFee +
        stallFee +
        insuranceFee +
        escortFee;

    // ==========================================
    // 11. TIỀN ĐẶT CỌC 50%
    // ==========================================
    const depositCost =
        totalCost * 0.5;

    // ==========================================
    // 12. TÌM BẢNG
    // ==========================================
    const tbody =
        document.querySelector('.data-table tbody');

    const tfoot =
        document.querySelector('.data-table tfoot');

    // ==========================================
    // 13. CẬP NHẬT CÁC DÒNG CHI PHÍ
    // ==========================================
    if (tbody) {

        tbody.innerHTML = `

            <!-- CƯỚC VẬN CHUYỂN -->
            <tr>
                <td>
                    <div class="font-semibold">
                        ${isDomestic
                ? 'Cước vận chuyển Nội địa đường bộ chuyên dụng'
                : 'Cước vận chuyển đường bộ xuyên quốc gia'
            }
                    </div>

                    <div class="text-muted" style="font-size: 0.8rem;">
                        ${data.originLocationName || ''
            }
                        &rarr;
                        ${data.destLocationName || ''
            }
                    </div>
                </td>

                <td class="text-right font-semibold">
                    ${(baseFreight / quantity)
                .toLocaleString('vi-VN')
            } ₫
                </td>

                <td class="text-center">
                    ${quantity} Cá thể
                </td>

                <td class="text-right font-bold">
                    ${baseFreight
                .toLocaleString('vi-VN')
            } ₫
                </td>
            </tr>


            <!-- KIỂM DỊCH -->
            <tr>
                <td>
                    <div class="font-semibold">
                        ${isDomestic
                ? 'Phí Kiểm dịch Thú y liên tỉnh'
                : 'Phí Kiểm dịch Thú y Quốc tế & Thủ tục Hải quan OIE'
            }
                    </div>

                    <div class="text-muted" style="font-size: 0.8rem;">
                        Chứng nhận an toàn sinh học và kiểm tra cửa khẩu
                    </div>
                </td>

                <td class="text-right font-semibold">
                    ${(quarantineFee / quantity)
                .toLocaleString('vi-VN')
            } ₫
                </td>

                <td class="text-center">
                    ${quantity} Đơn
                </td>

                <td class="text-right font-bold">
                    ${quarantineFee
                .toLocaleString('vi-VN')
            } ₫
                </td>
            </tr>


            <!-- THỨC ĂN -->
            <tr>
                <td>
                    <div class="font-semibold">
                        Khẩu phần dinh dưỡng
                        (${data.foodTypeName ||
            'Cỏ khô Timothy Hay'
            })
                    </div>

                    <div class="text-muted" style="font-size: 0.8rem;">
                        Dự phòng 3 ngày hành trình và thời gian trung chuyển
                    </div>
                </td>

                <td class="text-right font-semibold">
                    500,000 ₫/ngày
                </td>

                <td class="text-center">
                    ${3 * quantity} Khẩu phần
                </td>

                <td class="text-right font-bold">
                    ${feedFee
                .toLocaleString('vi-VN')
            } ₫
                </td>
            </tr>


            <!-- KHOANG -->
            <tr>
                <td>
                    <div class="font-semibold">
                        Quy cách khoang vận chuyển:
                        ${data.stallTypeName ||
            'Khoang Tiêu chuẩn'
            }
                    </div>

                    <div class="text-muted" style="font-size: 0.8rem;">
                        Sàn đệm cao su giảm chấn, thông khí đa chiều
                    </div>
                </td>

                <td class="text-right font-semibold">
                    ${stallFee > 0
                ? (stallFee / quantity)
                    .toLocaleString('vi-VN') + ' ₫'
                : '—'
            }
                </td>

                <td class="text-center">
                    ${quantity} Khoang
                </td>

                <td
                    class="text-right font-bold"
                    style="${stallFee > 0
                ? ''
                : 'color: #059669;'
            }"
                >
                    ${stallFee > 0
                ? stallFee.toLocaleString('vi-VN') + ' ₫'
                : 'Đã bao gồm'
            }
                </td>
            </tr>


            <!-- BẢO HIỂM -->
            <tr>
                <td>
                    <div class="font-semibold">
                        Bảo hiểm vận chuyển
                        (${data.insuranceName ||
            'Gói Cơ bản'
            })
                    </div>

                    <div class="text-muted" style="font-size: 0.8rem;">
                        Giá trị ngựa khai báo:
                        ${horseValue.toLocaleString('vi-VN')
            } ₫
                    </div>
                </td>

                <td class="text-right font-semibold">
                    ${(insuranceRate * 100).toFixed(1)
            }% giá trị
                </td>

                <td class="text-center">
                    1 Hợp đồng
                </td>

                <td class="text-right font-bold">
                    ${insuranceFee
                .toLocaleString('vi-VN')
            } ₫
                </td>
            </tr>


            <!-- ESCORT -->
            <tr>
                <td>
                    <div class="font-semibold">
                        Chuyên viên Hộ tống & Giám sát Y tế Sức khỏe 24/7 (Escort)
                    </div>

                    <div class="text-muted" style="font-size: 0.8rem;">
                        Theo dõi sinh trắc, nhịp tim và báo cáo GPS theo thời gian thực
                    </div>
                </td>

                <td class="text-right font-semibold">
                    ${escortFee
                .toLocaleString('vi-VN')
            } ₫
                </td>

                <td class="text-center">
                    1 Chuyên viên
                </td>

                <td class="text-right font-bold">
                    ${escortFee
                .toLocaleString('vi-VN')
            } ₫
                </td>
            </tr>
        `;
    }

    // ==========================================
    // 14. TỔNG + TIỀN ĐẶT CỌC
    // ==========================================
    if (tfoot) {

        tfoot.innerHTML = `

            <tr style="background: #0f172a; color: white;">

                <td
                    colspan="3"
                    style="
                        padding: 14px 16px;
                        font-weight: 700;
                        font-size: 1rem;
                    "
                >
                    TỔNG CHI PHÍ DỰ TOÁN TỰ ĐỘNG
                </td>

                <td
                    class="text-right"
                    style="
                        padding: 14px 16px;
                        font-weight: 800;
                        font-size: 1.2rem;
                        color: #fb923c;
                    "
                >
                    ${totalCost.toLocaleString('vi-VN')
            } VND
                </td>

            </tr>


            
        `;
    }
}

function formatDateVN(dateStr) {
    if (!dateStr) return '15/11/2026';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// ==========================================
// 8. TỰ ĐỘNG KHỞI CHẠY KHI TẢI TRANG
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;

    if (path.includes('create_request_step2.html')) {
        initStep2();
    } else if (path.includes('create_request_step3.html')) {
        initStep3();
    } else if (path.includes('create_request_step4.html')) {
        initStep4();
    } else if (path.includes('create_request.html')) {
        initStep1();
    }
});
