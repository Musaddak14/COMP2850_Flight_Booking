/** Creates a support ticket from the current form values and reports the result inline on the page. */
async function createTicket(event) {
    event.preventDefault();

    const result = document.getElementById("result");

    /** Build the API payload directly from the current form controls. */
    const ticketData = {
        bookingId: parseInt(document.getElementById("bookingId").value),
        customerName: document.getElementById("customerName").value,
        customerEmail: document.getElementById("customerEmail").value,
        requestType: document.getElementById("requestType").value,
        message: document.getElementById("message").value
    };

    try {
        // Submit the support request to the backend ticket endpoint.
        const response = await fetch("/api/tickets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(ticketData)
        });

        const responseText = await response.text();

        if (response.ok) {
            // Clear the form after a successful submission so the user can start a new request cleanly.
            result.textContent = "Support request submitted successfully.";
            document.getElementById("ticketForm").reset();
        } else {
            // Surface any backend message directly when the request is rejected.
            result.textContent = responseText || "Failed to submit support request.";
        }
    } catch (error) {
        console.error("Failed to submit support request.", error);
        result.textContent = "Could not submit your request right now. Please try again.";
    }
}

/** Wire the form submit event to the async ticket creation flow. */
document.getElementById("ticketForm").addEventListener("submit", createTicket);
