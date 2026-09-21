/* ==================================================
   DOM ELEMENTS
================================================== */

const logoutBtn = document.getElementById("logoutBtn");

const navItems = document.querySelectorAll(".nav-item");

const navigationButtons = document.querySelectorAll(
    ".home-action-card, .mobile-back-btn"
);

const tabContents = document.querySelectorAll(".tab-content");

const tripSelect = document.getElementById("tripId");

const horseSelect = document.getElementById("horseId");

const submitButton = document.getElementById("submitReport");

const submitMessage =
    document.getElementById("submitMessage");

const historyContainer =
    document.getElementById("historyContainer");

const reportDetail =
    document.getElementById("reportDetail");

const detailBackBtn =
    document.getElementById("detailBackBtn");

const deleteAllReportsButton =
    document.getElementById("deleteAllReports");

const deleteConfirmation =
    document.getElementById("deleteConfirmation");

const cancelDeleteReportsButton =
    document.getElementById("cancelDeleteReports");

const confirmDeleteReportsButton =
    document.getElementById("confirmDeleteReports");

function showSubmitMessage(title, message, isError = false) {

    submitMessage.classList.toggle("error", isError);
    submitMessage.classList.add("show");

    submitMessage.querySelector("i").className = isError
        ? "fa-solid fa-circle-exclamation"
        : "fa-solid fa-circle-check";

    submitMessage.querySelector("strong").textContent = title;
    submitMessage.querySelector("span").textContent = message;

    submitMessage.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


/* ==================================================
   DEMO HORSE DATA
================================================== */

const horsesByTrip = {

    "EQ-2026-9842": [
        "HORSE-001",
        "HORSE-002"
    ],

    "EQ-2026-7731": [
        "HORSE-004",
        "HORSE-005"
    ],

    "EQ-2026-5520": [
        "HORSE-007",
        "HORSE-008"
    ]

};


/* ==================================================
   DEMO HEALTH REPORT DATA
================================================== */

/*
 * This is NOT backend data.
 *
 * It only exists while this page is open.
 *
 * Refreshing the page resets this array.
 */

let healthReports = [

    {
        id: 1,

        tripId: "EQ-2026-9842",

        horseId: "HORSE-001",

        date: "18/10/2026 - 09:30",

        temperature: "38.5",

        status: "normal",

        statusText: "Bình thường",

        notes:
            "Horse was in normal condition.",

        otherDescription: "",

        image: null
    },


    {
        id: 2,

        tripId: "EQ-2026-7731",

        horseId: "HORSE-004",

        date: "16/10/2026 - 14:15",

        temperature: "39.1",

        status: "mild",

        statusText: "Mệt nhẹ",

        notes:
            "Horse showed mild signs of fatigue.",

        otherDescription: "",

        image: null
    },


    {
        id: 3,

        tripId: "EQ-2026-5520",

        horseId: "HORSE-007",

        date: "12/10/2026 - 11:45",

        temperature: "39.6",

        status: "sick",

        statusText: "Mắc bệnh",

        notes:
            "Horse required additional monitoring.",

        otherDescription: "",

        image: null
    }

];


/* ==================================================
   LOGOUT
================================================== */

if (logoutBtn) {

    logoutBtn.addEventListener("click", function () {

        window.location.href = "../index.html";

    });

}


/* ==================================================
   TAB SWITCHING
================================================== */

function showTab(targetTab) {

    tabContents.forEach(content => {

        content.classList.add("hidden");

        content.classList.remove("active");

    });


    const activeContent =
        document.getElementById(`tab-${targetTab}`);


    if (activeContent) {

        activeContent.classList.remove("hidden");

        activeContent.classList.add("active");

    }


    navItems.forEach(nav => {

        nav.classList.remove("active");

        if (
            nav.getAttribute("data-tab")
            === targetTab
        ) {

            nav.classList.add("active");

        }

    });


    /*
     * When opening history,
     * refresh the displayed reports.
     */

    if (targetTab === "history") {

        renderHistory();

    }

}


/* ==================================================
   DESKTOP SIDEBAR
================================================== */

navItems.forEach(item => {

    item.addEventListener("click", function () {

        const targetTab =
            this.getAttribute("data-tab");

        showTab(targetTab);

    });

});


/* ==================================================
   MOBILE NAVIGATION
================================================== */

navigationButtons.forEach(button => {

    button.addEventListener("click", function () {

        const targetTab =
            this.getAttribute("data-tab");

        showTab(targetTab);

    });

});


/* ==================================================
   INITIAL PAGE
================================================== */

function setInitialPage() {

    if (window.innerWidth <= 768) {

        showTab("home");

    } else {

        showTab("report");

    }

}

setInitialPage();


/* ==================================================
   TRIP → HORSE
================================================== */

tripSelect.addEventListener("change", function () {

    const selectedTrip = this.value;


    horseSelect.innerHTML =
        '<option value="">Select Horse ID</option>';


    if (!selectedTrip) {

        horseSelect.disabled = true;

        return;

    }


    const horses =
        horsesByTrip[selectedTrip];


    if (!horses) {

        horseSelect.disabled = true;

        return;

    }


    horses.forEach(horseId => {

        const option =
            document.createElement("option");

        option.value = horseId;

        option.textContent = horseId;

        horseSelect.appendChild(option);

    });


    horseSelect.disabled = false;

});


/* ==================================================
   HEALTH STATUS
================================================== */

const healthOptions =
    document.querySelectorAll(
        'input[name="health"]'
    );

const otherInputContainer =
    document.getElementById(
        "other-input-container"
    );


healthOptions.forEach(option => {

    option.addEventListener("change", function () {

        document
            .querySelectorAll(".radio-option")
            .forEach(item => {

                item.classList.remove("selected");

            });


        this
            .closest(".radio-option")
            .classList.add("selected");


        if (this.value === "other") {

            otherInputContainer.classList.add("show");

        } else {

            otherInputContainer.classList.remove("show");

        }

    });

});


/* ==================================================
   OTHER CHARACTER COUNTER
================================================== */

const otherText =
    document.getElementById(
        "other-health-text"
    );

const otherCounter =
    document.getElementById(
        "otherCounter"
    );


otherText.addEventListener("input", function () {

    otherCounter.textContent =
        `${this.value.length}/500`;

});


/* ==================================================
   NOTES CHARACTER COUNTER
================================================== */

const notes =
    document.getElementById("notes");

const notesCounter =
    document.getElementById("notesCounter");


notes.addEventListener("input", function () {

    notesCounter.textContent =
        `${this.value.length}/500`;

});


/* ==================================================
   IMAGE UPLOAD
================================================== */

const horseImage =
    document.getElementById("horseImage");

const imagePreview =
    document.getElementById("imagePreview");

const previewImage =
    document.getElementById("previewImage");

const removeImage =
    document.getElementById("removeImage");


/*
 * Temporary image data.
 *
 * It only exists in browser memory.
 */

let selectedImage = null;


horseImage.addEventListener("change", function () {

    const file = this.files[0];


    if (!file) {

        selectedImage = null;

        imagePreview.classList.remove("show");

        return;

    }


    const reader = new FileReader();


    reader.onload = function (event) {

        selectedImage = event.target.result;

        previewImage.src = selectedImage;

        imagePreview.classList.add("show");

    };


    reader.readAsDataURL(file);

});


/* ==================================================
   REMOVE IMAGE
================================================== */

removeImage.addEventListener("click", function () {

    horseImage.value = "";

    selectedImage = null;

    previewImage.src = "";

    imagePreview.classList.remove("show");

});


/* ==================================================
   SUBMIT HEALTH REPORT
================================================== */

submitButton.addEventListener("click", function () {

    const tripId =
        tripSelect.value;

    const horseId =
        horseSelect.value;

    const date =
        document.getElementById("date").value;

    const temperature =
        document.getElementById("temperature").value;

    const selectedHealth =
        document.querySelector(
            'input[name="health"]:checked'
        );

    const notesValue =
        notes.value.trim();

    const otherDescription =
        otherText.value.trim();


    /* ================= VALIDATION ================= */

    if (!tripId) {

        showSubmitMessage(
            "Missing Trip ID",
            "Please select a Trip ID before submitting.",
            true
        );

        return;

    }


    if (!horseId) {

        showSubmitMessage(
            "Missing Horse ID",
            "Please select a Horse ID before submitting.",
            true
        );

        return;

    }


    if (!date) {

        showSubmitMessage(
            "Missing inspection date",
            "Please select the inspection date and time.",
            true
        );

        return;

    }


    if (!temperature) {

        showSubmitMessage(
            "Missing temperature",
            "Please enter the horse temperature.",
            true
        );

        return;

    }


    if (!selectedHealth) {

        showSubmitMessage(
            "Missing health status",
            "Please select the horse health status.",
            true
        );

        return;

    }


    if (
        selectedHealth.value === "other"
        && !otherDescription
    ) {

        showSubmitMessage(
            "Missing health description",
            "Please describe the health condition.",
            true
        );

        return;

    }


    /* ================= STATUS ================= */

    const statusMap = {

        normal: "Bình thường",

        mild: "Mệt nhẹ",

        sick: "Mắc bệnh",

        serious: "Căng thẳng nặng",

        critical: "Qua đời",

        other: "Khác"

    };


    /* ================= DATE ================= */

    const dateObject =
        new Date(date);


    const formattedDate =
        dateObject.toLocaleString(
            "vi-VN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );


    /* ================= NEW REPORT ================= */

    const newReport = {

        id: Date.now(),

        tripId: tripId,

        horseId: horseId,

        date: formattedDate,

        temperature: temperature,

        status: selectedHealth.value,

        statusText:
            statusMap[selectedHealth.value],

        notes:
            notesValue || "No notes provided.",

        otherDescription:
            otherDescription,

        image:
            selectedImage

    };


    /* ================= ADD TO ARRAY ================= */

    healthReports.unshift(newReport);


    /* ================= UPDATE HISTORY ================= */

    renderHistory();


    /* ================= RESET FORM ================= */

    resetReportForm();


    showSubmitMessage(
        "Health Report submitted",
        "The health report was recorded successfully."
    );

});


/* ==================================================
   RENDER HISTORY
================================================== */

function renderHistory() {

    historyContainer.innerHTML = "";


    /*
     * NO REPORTS
     */

    if (healthReports.length === 0) {

        historyContainer.innerHTML = `

            <div class="history-empty">

                <div class="empty-icon">
                    <i class="fa-solid fa-file-medical"></i>
                </div>

                <h2>
                    No Health Reports Yet
                </h2>

                <p>
                    There are no health reports available.
                </p>

            </div>

        `;

        return;

    }


    /*
     * REPORTS EXIST
     */

    healthReports.forEach(report => {

        const card =
            document.createElement("div");

        card.className = "history-card";

        card.setAttribute(
            "data-report-id",
            report.id
        );


        card.innerHTML = `

            <div class="history-header">

                <div>

                    <span class="history-trip">
                        ${report.tripId}
                    </span>

                    <h3>
                        Horse: ${report.horseId}
                    </h3>

                </div>

                <span class="status ${report.status}">
                    ${report.statusText}
                </span>

            </div>


            <div class="history-info">

                <div>

                    <span>
                        Ngày kiểm tra
                    </span>

                    <strong>
                        ${report.date}
                    </strong>

                </div>


                <div>

                    <span>
                        Nhiệt độ
                    </span>

                    <strong>
                        ${report.temperature} °C
                    </strong>

                </div>

            </div>


            <p class="history-notes">
                ${report.notes}
            </p>


            <div class="view-report">

                <span>
                    View Report
                </span>

                <i class="fa-solid fa-chevron-right"></i>

            </div>

        `;


        card.addEventListener("click", function () {

            openReportDetail(report.id);

        });


        historyContainer.appendChild(card);

    });

}


/* ==================================================
   OPEN REPORT DETAIL
================================================== */

function openReportDetail(reportId) {

    const report =
        healthReports.find(
            item => item.id === reportId
        );


    if (!report) return;


    let imageHTML = "";


    if (report.image) {

        imageHTML = `

            <div class="detail-section">

                <h3>
                    Health Condition Image
                </h3>

                <img
                    class="detail-image"
                    src="${report.image}"
                    alt="Horse health condition">

            </div>

        `;

    }


    let otherHTML = "";


    if (report.otherDescription) {

        otherHTML = `

            <div class="detail-section">

                <h3>
                    Additional Condition
                </h3>

                <p>
                    ${report.otherDescription}
                </p>

            </div>

        `;

    }


    reportDetail.innerHTML = `

        <div class="detail-header">

            <div>

                <span class="history-trip">
                    ${report.tripId}
                </span>

                <h2>
                    Horse: ${report.horseId}
                </h2>

            </div>

            <span class="status ${report.status}">
                ${report.statusText}
            </span>

        </div>


        <div class="detail-grid">

            <div class="detail-item">

                <span>
                    Trip ID
                </span>

                <strong>
                    ${report.tripId}
                </strong>

            </div>


            <div class="detail-item">

                <span>
                    Horse ID
                </span>

                <strong>
                    ${report.horseId}
                </strong>

            </div>


            <div class="detail-item">

                <span>
                    Inspection Date
                </span>

                <strong>
                    ${report.date}
                </strong>

            </div>


            <div class="detail-item">

                <span>
                    Temperature
                </span>

                <strong>
                    ${report.temperature} °C
                </strong>

            </div>

        </div>


        <div class="detail-section">

            <h3>
                Notes
            </h3>

            <p>
                ${report.notes}
            </p>

        </div>


        ${otherHTML}

        ${imageHTML}

    `;


    showTab("detail");

}


/* ==================================================
   DETAIL BACK BUTTON
================================================== */

detailBackBtn.addEventListener("click", function () {

    showTab("history");

});


/* ==================================================
   RESET FORM
================================================== */

function resetReportForm() {

    tripSelect.value = "";

    horseSelect.innerHTML =
        '<option value="">Select Horse ID</option>';

    horseSelect.disabled = true;


    document.getElementById("date").value = "";

    document.getElementById("temperature").value = "";


    healthOptions.forEach(option => {

        option.checked = false;

        option
            .closest(".radio-option")
            .classList.remove("selected");

    });


    otherInputContainer.classList.remove("show");

    otherText.value = "";

    otherCounter.textContent = "0/500";


    notes.value = "";

    notesCounter.textContent = "0/500";


    horseImage.value = "";

    selectedImage = null;

    previewImage.src = "";

    imagePreview.classList.remove("show");

}


/* ==================================================
   DELETE ALL REPORTS
================================================== */

deleteAllReportsButton.addEventListener("click", function () {

    if (healthReports.length === 0) return;

    deleteConfirmation.classList.add("show");
    deleteConfirmation.setAttribute("aria-hidden", "false");

});


cancelDeleteReportsButton.addEventListener("click", function () {

    deleteConfirmation.classList.remove("show");
    deleteConfirmation.setAttribute("aria-hidden", "true");

});


confirmDeleteReportsButton.addEventListener("click", function () {

    healthReports = [];

    renderHistory();

    deleteConfirmation.classList.remove("show");
    deleteConfirmation.setAttribute("aria-hidden", "true");

});
