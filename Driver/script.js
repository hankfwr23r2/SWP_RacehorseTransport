// DOM Elements
const logoutBtn = document.getElementById("logoutBtn");
const navItems = document.querySelectorAll(".nav-item, .bottom-nav-item");
const tabContents = document.querySelectorAll(".tab-content");

/* ================= LOGOUT ================= */
if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
        window.location.href = "../index.html"; // Redirect to root login
    });
}

/* ================= TAB SWITCHING ================= */
navItems.forEach(item => {
    item.addEventListener("click", function () {
        const targetTab = this.getAttribute("data-tab");

        // Update active states on all nav buttons
        navItems.forEach(nav => nav.classList.remove("active"));
        
        // Find both desktop and mobile buttons for this tab and activate them
        const matchingNavs = document.querySelectorAll(`[data-tab="${targetTab}"]`);
        matchingNavs.forEach(nav => nav.classList.add("active"));

        // Hide all tabs, show target tab
        tabContents.forEach(content => {
            content.classList.add("hidden");
            content.classList.remove("active");
        });

        const activeContent = document.getElementById(`tab-${targetTab}`);
        if (activeContent) {
            activeContent.classList.remove("hidden");
            activeContent.classList.add("active");
        }
    });
});

/* ================= CHECK-IN LOGIC ================= */
function checkIn(milestoneId) {
    const currentMilestone = document.querySelector(`.milestone[data-id="${milestoneId}"]`);
    
    if (!currentMilestone) return;

    // 1. Mark current as completed
    currentMilestone.classList.remove("active");
    currentMilestone.classList.add("completed");
    
    // Update Icon
    const iconContainer = currentMilestone.querySelector(".milestone-icon");
    iconContainer.innerHTML = '<i class="fa-solid fa-check"></i>';
    
    // Update Text
    const statusText = currentMilestone.querySelector(".m-status");
    statusText.textContent = "Đã hoàn thành";
    statusText.className = "m-status completed-text";
    
    // Update Action Area
    const actionContainer = currentMilestone.querySelector(".m-action");
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    actionContainer.innerHTML = `<span class="timestamp">Đã check-in lúc ${timeString}</span>`;

    // 2. Unlock the next milestone
    const nextMilestoneId = milestoneId + 1;
    const nextMilestone = document.querySelector(`.milestone[data-id="${nextMilestoneId}"]`);
    
    if (nextMilestone) {
        nextMilestone.classList.remove("disabled");
        nextMilestone.classList.add("active");
        
        const nextStatus = nextMilestone.querySelector(".m-status");
        nextStatus.textContent = "Chờ xử lý";
        nextStatus.className = "m-status pending-text";
        
        const nextButton = nextMilestone.querySelector(".btn-checkin");
        if (nextButton) {
            nextButton.removeAttribute("disabled");
            nextButton.setAttribute("onclick", `checkIn(${nextMilestoneId})`);
        }
    } else {
        // If there's no next milestone, the trip is entirely finished.
        setTimeout(() => {
            alert("Đã hoàn tất chuyến đi! Tất cả các chặng đã được check-in.");
        }, 300);
    }
}