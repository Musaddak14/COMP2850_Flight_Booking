(() => {
    "use strict";

    const sessionId = sessionStorage.getItem("sessionId");
    const userId = sessionStorage.getItem("userId");

    if (!sessionId || !userId) {
        window.location.href = "/log_in";
        return;
    }

    async function loadAccountData() {
        const res = await fetch(`/api/account-summary?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById("membership-number").textContent = data.membershipNumber;
        document.getElementById("membership-tier").textContent = data.membershipTier;
        document.getElementById("loyalty-points").textContent = data.loyaltyPoints.toLocaleString();
    }

    async function loadUserDetails() {
        const res = await fetch(`/api/user/details?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById("firstName").value = data.firstName;
        document.getElementById("lastName").value = data.lastName;
        document.getElementById("dateOfBirth").value = data.dateOfBirth;
        document.getElementById("email").value = data.email;
        document.getElementById("seatPreference").value = data.seatPreference;
    }

    loadAccountData();
    loadUserDetails();

    document.getElementById("edit-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const msg = document.getElementById("save-message");
        const btn = document.querySelector(".login-btn");

        btn.disabled = true;
        msg.textContent = "";
        msg.removeAttribute("data-state");

        const body = {
            userId: parseInt(userId),
            firstName: document.getElementById("firstName").value.trim(),
            lastName: document.getElementById("lastName").value.trim(),
            dateOfBirth: document.getElementById("dateOfBirth").value,
            email: document.getElementById("email").value.trim(),
            seatPreference: document.getElementById("seatPreference").value
        };

        try {
            const res = await fetch("/api/user/update", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                msg.textContent = "Changes saved successfully.";
                msg.dataset.state = "success";
                sessionStorage.setItem("firstName", body.firstName);
                sessionStorage.setItem("lastName", body.lastName);
            } else {
                msg.textContent = "Something went wrong. Please try again.";
                msg.dataset.state = "error";
            }
        } catch (_) {
            msg.textContent = "Network error. Please try again.";
            msg.dataset.state = "error";
        }

        btn.disabled = false;
    });
})();

// Made with the assistance of Claude Sonnit 4.8