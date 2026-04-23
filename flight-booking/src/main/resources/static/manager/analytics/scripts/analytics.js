(() => {
    "use strict";

    const analyticsEndpoint = "/api/manager/analytics";
    const analyticsMessage = document.getElementById("analytics-message");
    const totalReservations = document.getElementById("total-reservations");
    const upcomingFlightsCount = document.getElementById("upcoming-flights-count");
    const openSupportTickets = document.getElementById("open-support-tickets");
    const popularRoute = document.getElementById("popular-route");
    const peakBookingTime = document.getElementById("peak-booking-time");
    const bookingsPerFlightBody = document.getElementById("bookings-per-flight-body");
    const popularRoutesBody = document.getElementById("popular-routes-body");
    const peakBookingTimesBody = document.getElementById("peak-booking-times-body");

    function setText(element, value, fallback = "Not available") {
        if (!element) {
            return;
        }

        if (value === null || value === undefined || value === "") {
            element.textContent = fallback;
            return;
        }

        element.textContent = String(value);
    }

    function getCount(value) {
        return value?.bookingCount ?? value?.count ?? value?.total ?? 0;
    }

    function formatRoute(route) {
        if (!route) {
            return null;
        }

        if (typeof route === "string") {
            return route;
        }

        const departure = route.departureAirport ?? route.from;
        const arrival = route.arrivalAirport ?? route.to;

        if (!departure || !arrival) {
            return null;
        }

        return `${departure} to ${arrival}`;
    }

    function formatRouteWithCount(route) {
        const label = formatRoute(route);
        if (!label) {
            return null;
        }

        const count = getCount(route);
        return typeof count === "number" ? `${label} (${count} bookings)` : label;
    }

    function formatPeakTime(value) {
        if (!value) {
            return null;
        }

        if (typeof value === "string") {
            return value;
        }

        const hour = value.hour ?? value.time ?? value.bookingHour;
        if (!hour) {
            return null;
        }

        const count = getCount(value);
        return typeof count === "number" ? `${hour} (${count} bookings)` : String(hour);
    }

    function setTableMessage(tbody, colspan, message) {
        if (!tbody) {
            return;
        }

        tbody.innerHTML = `<tr><td colspan="${colspan}">${message}</td></tr>`;
    }

    function renderBookingsPerFlight(rows) {
        if (!Array.isArray(rows) || rows.length === 0) {
            setTableMessage(bookingsPerFlightBody, 4, "No bookings-per-flight data yet.");
            return;
        }

        bookingsPerFlightBody.innerHTML = rows.map((row) => {
            const route = formatRoute(row) ?? "Not available";
            const date = row.date ?? "Not available";
            const count = getCount(row);

            return `
                <tr>
                    <td>${row.flightId ?? "Not available"}</td>
                    <td>${route}</td>
                    <td>${date}</td>
                    <td>${count}</td>
                </tr>
            `;
        }).join("");
    }

    function renderPopularRoutes(rows, fallbackRoute) {
        if (Array.isArray(rows) && rows.length > 0) {
            popularRoutesBody.innerHTML = rows.map((row) => `
                <tr>
                    <td>${formatRoute(row) ?? "Not available"}</td>
                    <td>${getCount(row)}</td>
                </tr>
            `).join("");
            return;
        }

        if (fallbackRoute) {
            popularRoutesBody.innerHTML = `
                <tr>
                    <td>${formatRoute(fallbackRoute) ?? fallbackRoute}</td>
                    <td>${typeof fallbackRoute === "object" ? getCount(fallbackRoute) : "Not available"}</td>
                </tr>
            `;
            return;
        }

        setTableMessage(popularRoutesBody, 2, "No popular-route data yet.");
    }

    function renderPeakBookingTimes(rows, fallbackTime) {
        if (Array.isArray(rows) && rows.length > 0) {
            peakBookingTimesBody.innerHTML = rows.map((row) => `
                <tr>
                    <td>${row.hour ?? row.time ?? row.bookingHour ?? "Not available"}</td>
                    <td>${getCount(row)}</td>
                </tr>
            `).join("");
            return;
        }

        if (fallbackTime) {
            peakBookingTimesBody.innerHTML = `
                <tr>
                    <td>${typeof fallbackTime === "object" ? (fallbackTime.hour ?? fallbackTime.time ?? fallbackTime.bookingHour ?? "Not available") : fallbackTime}</td>
                    <td>${typeof fallbackTime === "object" ? getCount(fallbackTime) : "Not available"}</td>
                </tr>
            `;
            return;
        }

        setTableMessage(peakBookingTimesBody, 2, "Needs booking timestamps before this report can be calculated.");
    }

    function renderAnalytics(data) {
        const topRoute = data.mostPopularRoute ?? data.popularRoute ?? data.popularRoutes?.[0];
        const topPeakTime = data.peakBookingTime ?? data.peakBookingTimes?.[0];

        setText(totalReservations, data.totalBookings ?? data.totalReservations ?? 0);
        setText(upcomingFlightsCount, data.upcomingFlights ?? data.upcomingFlightCount ?? 0);
        setText(openSupportTickets, data.openTickets ?? data.openSupportTickets ?? 0);
        setText(popularRoute, formatRouteWithCount(topRoute), "No route data yet");
        setText(peakBookingTime, formatPeakTime(topPeakTime), "Needs booking timestamps");

        renderBookingsPerFlight(data.bookingsPerFlight);
        renderPopularRoutes(data.popularRoutes, topRoute);
        renderPeakBookingTimes(data.peakBookingTimes, topPeakTime);
    }

    function renderAnalyticsUnavailable() {
        setText(totalReservations, "Backend pending");
        setText(upcomingFlightsCount, "Backend pending");
        setText(openSupportTickets, "Backend pending");
        setText(popularRoute, "Backend pending");
        setText(peakBookingTime, "Backend pending");

        setTableMessage(bookingsPerFlightBody, 4, "Add /api/manager/analytics to populate this report.");
        setTableMessage(popularRoutesBody, 2, "Add /api/manager/analytics to populate this report.");
        setTableMessage(peakBookingTimesBody, 2, "Add booking timestamps to populate this report.");

        if (analyticsMessage) {
            analyticsMessage.textContent = "Analytics page is ready. Complete the backend endpoint to show live data.";
        }
    }

    async function loadAnalytics() {
        try {
            const response = await fetch(analyticsEndpoint);

            if (!response.ok) {
                throw new Error(`Analytics request failed with status ${response.status}`);
            }

            const data = await response.json();
            renderAnalytics(data);

            if (analyticsMessage) {
                analyticsMessage.textContent = "";
            }
        } catch (error) {
            renderAnalyticsUnavailable();
            console.warn(error);
        }
    }

    loadAnalytics();
})();
