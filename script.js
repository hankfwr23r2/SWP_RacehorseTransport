const content = document.getElementById("content");

const viewTripBtn = document.getElementById("viewTripBtn");

const progressBtn = document.getElementById("progressBtn");

const logoutBtn = document.getElementById("logoutBtn");

const mobileBackBtn = document.getElementById("mobileBackBtn");


/* ================= MOBILE BACK ================= */

if (mobileBackBtn) {

    mobileBackBtn.addEventListener("click", function () {

        window.location.href = "driver.html";

    });

}


/* ================= VIEW TRIP ================= */

if (viewTripBtn) {

    viewTripBtn.addEventListener("click", function () {

        viewTripBtn.classList.add("active");

        progressBtn.classList.remove("active");

        content.innerHTML = `

            <div class="page-header">

                <div>

                    <h1>View Trip</h1>

                    <p>
                        View the details of your assigned horse transport.
                    </p>

                </div>

            </div>

            <div class="trip-page-card">

                <div class="trip-page-header">

                    <div>

                        <div class="trip-page-id">
                            EQ-2026-9842
                        </div>

                        <div class="trip-page-route">
                            Doha → Paris
                        </div>

                    </div>

                    <span class="trip-page-status">
                        ● In Progress
                    </span>

                </div>

                <div class="trip-page-message">
                    Trip details are currently being prepared.
                </div>

            </div>

        `;

    });

}


/* ================= TRANSPORT PROGRESS ================= */

if (progressBtn) {

    progressBtn.addEventListener("click", function () {

        progressBtn.classList.add("active");

        viewTripBtn.classList.remove("active");

        location.reload();

    });

}


/* ================= LOGOUT ================= */

if (logoutBtn) {

    logoutBtn.addEventListener("click", function () {

        window.location.href = "login.html";

    });

}