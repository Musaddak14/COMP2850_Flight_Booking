(() => {
    "use strict";

    const form = document.getElementById("email-form");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const message = document.getElementById("login-message");
    const otpSection = document.getElementById("otp-section");
    const otpInput = document.getElementById("otp-input");
    const otpMessage = document.getElementById("otp-message");
    const otpSubmitBtn = document.getElementById("otp-submit-btn");

    let pendingEmail = null;

    function setMsg(el, text, state) {
        if (!el) return;
        el.textContent = text;
        el.dataset.state = state;
    }

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = (emailInput?.value ?? "").trim();
        const password = passwordInput?.value ?? "";

        if (!email || !password) {
            setMsg(message, "Please enter your email and password.", "error");
            return;
        }

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const rawBody = await response.text();
            let data = {};
            if (rawBody) {
                try { data = JSON.parse(rawBody); } catch { throw new Error(rawBody); }
            }

            if (!response.ok) throw new Error(data.error || data.message || "Unable to sign in.");

            if (data.otpRequired) {
                pendingEmail = email;
                form.classList.add("hidden");
                otpSection.classList.remove("hidden");
            }

        } catch (error) {
            setMsg(message, error.message || "Unable to sign in.", "error");
        }
    });

    otpSubmitBtn?.addEventListener("click", async () => {
        const otp = (otpInput?.value ?? "").trim();

        if (!otp) {
            setMsg(otpMessage, "Please enter your code.", "error");
            return;
        }

        try {
            const response = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: pendingEmail, otp })
            });

            const rawBody = await response.text();
            let data = {};
            if (rawBody) {
                try { data = JSON.parse(rawBody); } catch { throw new Error(rawBody); }
            }

            if (!response.ok || !data.success) throw new Error(data.error || data.message || "Invalid code.");

            sessionStorage.setItem("sessionId", data.sessionId);
            sessionStorage.setItem("userId", data.userId);
            sessionStorage.setItem("userEmail", data.email);
            sessionStorage.setItem("firstName", data.firstName);
            sessionStorage.setItem("lastName", data.lastName);
            sessionStorage.setItem("role", data.role);
            sessionStorage.setItem("user", JSON.stringify({ userId: Number(data.userId) }));

            setMsg(otpMessage, "Login successful. Redirecting...", "success");
            window.setTimeout(() => { window.location.href = "/"; }, 800);

        } catch (error) {
            setMsg(otpMessage, error.message || "Invalid code.", "error");
        }
    });
})();