async function createTicket(event) {
    event.preventDefault();

    const ticketData = {
        bookingId: parseInt(document.getElementById("bookingId").value),
        customerName: document.getElementById("customerName").value,
        customerEmail: document.getElementById("customerEmail").value,
        requestType: document.getElementById("requestType").value,
        message: document.getElementById("message").value
    };

    const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(ticketData)
    });

    const result = document.getElementById("result");
    const responseText = await response.text();

    if (response.ok) {
        result.textContent = "Support request submitted successfully.";
        document.getElementById("ticketForm").reset();
    } else {
        result.textContent = responseText || "Failed to submit support request.";
    }
}

document.getElementById("ticketForm").addEventListener("submit", createTicket);