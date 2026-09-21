
// DOM Elements
const logoutBtn = document.getElementById("logoutBtn");
const navItems = document.querySelectorAll(".nav-item");
const navigationButtons = document.querySelectorAll(
    ".home-action-card, .mobile-back-btn"
);
const tabContents = document.querySelectorAll(".tab-content");
const horseDetailsBtn = document.getElementById("horseDetailsBtn");
const horseDetailsModal = document.getElementById("horseDetailsModal");
const closeHorseModalButtons = document.querySelectorAll("[data-close-horse-modal]");


/* ================= LOGOUT ================= */

if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
        window.location.href = "../index.html";
    });
}


/* ================= TAB SWITCHING ================= */

function showTab(targetTab) {

    // Hide all tabs
    tabContents.forEach(content => {
        content.classList.remove("active");
    });

    // Show selected tab
    const activeContent = document.getElementById(`tab-${targetTab}`);

    if (activeContent) {
        activeContent.classList.add("active");
    }

    // Update desktop sidebar active state
    navItems.forEach(nav => {
        nav.classList.remove("active");

        if (nav.getAttribute("data-tab") === targetTab) {
            nav.classList.add("active");
        }
    });
}

/* ================= DESKTOP SIDEBAR ================= */

navItems.forEach(item => {
    item.addEventListener("click", function () {

        const targetTab = this.getAttribute("data-tab");

        showTab(targetTab);
    });
});


/* ================= MOBILE NAVIGATION ================= */

navigationButtons.forEach(button => {
    button.addEventListener("click", function () {

        const targetTab = this.getAttribute("data-tab");

        showTab(targetTab);
    });
});

/* ================= HORSE DETAILS ================= */

function setHorseModalVisibility(isVisible) {
    if (!horseDetailsModal) return;

    horseDetailsModal.classList.toggle("hidden", !isVisible);
    document.body.classList.toggle("modal-open", isVisible);
}

if (horseDetailsBtn) {
    horseDetailsBtn.addEventListener("click", () => setHorseModalVisibility(true));
}

closeHorseModalButtons.forEach(button => {
    button.addEventListener("click", () => setHorseModalVisibility(false));
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") setHorseModalVisibility(false);
});

/* ================= INITIAL PAGE ================= */

// Mobile → Home
// Desktop → View Trip

function setInitialPage() {

    if (window.innerWidth <= 768) {
        showTab("home");
    } else {
        showTab("trip");
    }
}

setInitialPage();


/* ================= CHECK-IN LOGIC ================= */

function checkIn(milestoneId) {

    const currentMilestone =
        document.querySelector(`.milestone[data-id="${milestoneId}"]`);

    if (!currentMilestone) return;


    // 1. Mark current milestone as completed

    currentMilestone.classList.remove("active");
    currentMilestone.classList.add("completed");


    // Update Icon

    const iconContainer =
        currentMilestone.querySelector(".milestone-icon");

    iconContainer.innerHTML =
        '<i class="fa-solid fa-check"></i>';


    // Update Status Text

    const statusText =
        currentMilestone.querySelector(".m-status");

    statusText.textContent = "Đã hoàn thành";
    statusText.className = "m-status completed-text";


    // Update Action Area

    const actionContainer =
        currentMilestone.querySelector(".m-action");

    const now = new Date();

    const timeString = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    actionContainer.innerHTML =
        `<span class="timestamp">Đã check-in lúc ${timeString}</span>`;


    // 2. Unlock the next milestone

    const nextMilestoneId = milestoneId + 1;

    const nextMilestone =
        document.querySelector(`.milestone[data-id="${nextMilestoneId}"]`);


    if (nextMilestone) {

        nextMilestone.classList.remove("disabled");
        nextMilestone.classList.add("active");


        const nextStatus =
            nextMilestone.querySelector(".m-status");

        nextStatus.textContent = "Chờ xử lý";
        nextStatus.className = "m-status pending-text";


        const nextButton =
            nextMilestone.querySelector(".btn-checkin");

        if (nextButton) {

            nextButton.removeAttribute("disabled");

            nextButton.setAttribute(
                "onclick",
                `checkIn(${nextMilestoneId})`
            );
        }

    } else {

        // Trip completely finished

        setTimeout(() => {

            alert(
                "Đã hoàn tất chuyến đi! Tất cả các chặng đã được check-in."
            );

        }, 300);
    }
}

