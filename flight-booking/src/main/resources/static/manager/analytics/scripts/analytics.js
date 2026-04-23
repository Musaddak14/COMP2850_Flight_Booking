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
    const bookingsPerFlightShowFewer = document.getElementById("bookings-per-flight-show-fewer");
    const bookingsPerFlightShowMore = document.getElementById("bookings-per-flight-show-more");
    const popularRoutesShowFewer = document.getElementById("popular-routes-show-fewer");
    const popularRoutesShowMore = document.getElementById("popular-routes-show-more");
    const hourlyBookingChart = document.getElementById("hourly-booking-chart");
    const hourlyBookingEmpty = document.getElementById("hourly-booking-empty");
    const initialReportLimit = 5;
    const reportStepSize = 25;
    let bookingsPerFlightRows = [];
    let popularRouteRows = [];
    let visibleBookingsPerFlightCount = initialReportLimit;
    let visiblePopularRoutesCount = initialReportLimit;

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
        if (hour === null || hour === undefined || hour === "") {
            return null;
        }

        const count = getCount(value);
        const hourLabel = formatHourLabel(hour);
        return typeof count === "number" ? `${hourLabel} (${count} bookings)` : hourLabel;
    }

    function setTableMessage(tbody, colspan, message) {
        if (!tbody) {
            return;
        }

        tbody.innerHTML = `<tr><td colspan="${colspan}">${message}</td></tr>`;
    }

    function updateReportControls(showFewerButton, showMoreButton, rows, visibleCount) {
        if (!showFewerButton || !showMoreButton) {
            return;
        }

        if (!Array.isArray(rows) || rows.length <= initialReportLimit) {
            showFewerButton.hidden = true;
            showMoreButton.hidden = true;
            return;
        }

        showFewerButton.hidden = visibleCount <= initialReportLimit;
        showMoreButton.hidden = visibleCount >= rows.length;
    }

    function renderBookingsPerFlight(rows) {
        if (!Array.isArray(rows) || rows.length === 0) {
            setTableMessage(bookingsPerFlightBody, 4, "No bookings-per-flight data yet.");
            updateReportControls(bookingsPerFlightShowFewer, bookingsPerFlightShowMore, rows, visibleBookingsPerFlightCount);
            return;
        }

        bookingsPerFlightRows = rows;
        visibleBookingsPerFlightCount = Math.min(
            Math.max(visibleBookingsPerFlightCount, initialReportLimit),
            rows.length
        );
        const visibleRows = rows.slice(0, visibleBookingsPerFlightCount);

        bookingsPerFlightBody.innerHTML = visibleRows.map((row) => {
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

        updateReportControls(
            bookingsPerFlightShowFewer,
            bookingsPerFlightShowMore,
            rows,
            visibleBookingsPerFlightCount
        );
    }

    function renderPopularRoutes(rows, fallbackRoute) {
        if (Array.isArray(rows) && rows.length > 0) {
            popularRouteRows = rows;
            visiblePopularRoutesCount = Math.min(
                Math.max(visiblePopularRoutesCount, initialReportLimit),
                rows.length
            );
            const visibleRows = rows.slice(0, visiblePopularRoutesCount);

            popularRoutesBody.innerHTML = visibleRows.map((row) => `
                <tr>
                    <td>${formatRoute(row) ?? "Not available"}</td>
                    <td>${getCount(row)}</td>
                </tr>
            `).join("");

            updateReportControls(
                popularRoutesShowFewer,
                popularRoutesShowMore,
                rows,
                visiblePopularRoutesCount
            );
            return;
        }

        if (fallbackRoute) {
            popularRouteRows = [fallbackRoute];
            popularRoutesBody.innerHTML = `
                <tr>
                    <td>${formatRoute(fallbackRoute) ?? fallbackRoute}</td>
                    <td>${typeof fallbackRoute === "object" ? getCount(fallbackRoute) : "Not available"}</td>
                </tr>
            `;
            updateReportControls(popularRoutesShowFewer, popularRoutesShowMore, popularRouteRows, visiblePopularRoutesCount);
            return;
        }

        popularRouteRows = [];
        setTableMessage(popularRoutesBody, 2, "No popular-route data yet.");
        updateReportControls(popularRoutesShowFewer, popularRoutesShowMore, popularRouteRows, visiblePopularRoutesCount);
    }

    function formatHourLabel(hour) {
        const numericHour = Number(hour);
        if (!Number.isFinite(numericHour)) {
            return "Not available";
        }

        return `${String(numericHour).padStart(2, "0")}:00`;
    }

    function normaliseBookingsByHour(rows) {
        const buckets = Array.from({ length: 24 }, (_, hour) => ({
            hour,
            count: 0
        }));

        if (!Array.isArray(rows)) {
            return buckets;
        }

        rows.forEach((row) => {
            const hour = Number(row.hour ?? row.time ?? row.bookingHour);
            const count = Number(row.count ?? row.bookingCount ?? row.total ?? 0);

            if (Number.isInteger(hour) && hour >= 0 && hour <= 23 && Number.isFinite(count)) {
                buckets[hour].count = count;
            }
        });

        return buckets;
    }

    function findPeakHour(rows) {
        const buckets = normaliseBookingsByHour(rows);
        const peak = buckets.reduce((currentPeak, row) => {
            return row.count > currentPeak.count ? row : currentPeak;
        }, buckets[0]);

        return peak.count > 0 ? peak : null;
    }

    function renderBookingsByHour(rows) {
        if (!hourlyBookingChart) {
            return;
        }

        const buckets = normaliseBookingsByHour(rows);
        const maxCount = Math.max(...buckets.map((row) => row.count), 0);

        hourlyBookingChart.innerHTML = "";

        buckets.forEach((row) => {
            const item = document.createElement("div");
            item.className = "hourly-bar-item";

            const bar = document.createElement("div");
            bar.className = "hourly-bar";
            bar.style.height = maxCount > 0 ? `${Math.max((row.count / maxCount) * 100, 4)}%` : "4%";
            bar.title = `${formatHourLabel(row.hour)}: ${row.count} booking${row.count === 1 ? "" : "s"}`;

            const value = document.createElement("span");
            value.className = "hourly-bar-value";
            value.textContent = String(row.count);

            const label = document.createElement("span");
            label.className = "hourly-bar-label";
            label.textContent = String(row.hour).padStart(2, "0");

            bar.appendChild(value);
            item.appendChild(bar);
            item.appendChild(label);
            hourlyBookingChart.appendChild(item);
        });

        if (hourlyBookingEmpty) {
            hourlyBookingEmpty.textContent = maxCount > 0
                ? "Each bar shows confirmed bookings created during that hour."
                : "No hourly booking data yet.";
        }
    }

    function renderAnalytics(data) {
        const topRoute = data.mostPopularRoute ?? data.popularRoute ?? data.popularRoutes?.[0];
        const bookingsByHour = data.bookingsPerHour ?? data.bookingsByHour ?? data.peakBookingTimes;
        const topPeakTime = data.peakBookingTime ?? findPeakHour(bookingsByHour);

        setText(totalReservations, data.totalBookings ?? data.totalReservations ?? 0);
        setText(upcomingFlightsCount, data.upcomingFlights ?? data.upcomingFlightCount ?? 0);
        setText(openSupportTickets, data.openTickets ?? data.openSupportTickets ?? 0);
        setText(popularRoute, formatRouteWithCount(topRoute), "No route data yet");
        setText(peakBookingTime, formatPeakTime(topPeakTime), "Needs booking timestamps");

        renderBookingsPerFlight(data.bookingsPerFlight);
        renderPopularRoutes(data.popularRoutes, topRoute);
        renderBookingsByHour(bookingsByHour);
    }

    function renderAnalyticsUnavailable() {
        setText(totalReservations, "Backend pending");
        setText(upcomingFlightsCount, "Backend pending");
        setText(openSupportTickets, "Backend pending");
        setText(popularRoute, "Backend pending");
        setText(peakBookingTime, "Backend pending");

        setTableMessage(bookingsPerFlightBody, 4, "Add /api/manager/analytics to populate this report.");
        setTableMessage(popularRoutesBody, 2, "Add /api/manager/analytics to populate this report.");
        updateReportControls(bookingsPerFlightShowFewer, bookingsPerFlightShowMore, [], visibleBookingsPerFlightCount);
        updateReportControls(popularRoutesShowFewer, popularRoutesShowMore, [], visiblePopularRoutesCount);
        renderBookingsByHour([]);

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

    if (bookingsPerFlightShowMore) {
        bookingsPerFlightShowMore.addEventListener("click", () => {
            visibleBookingsPerFlightCount += reportStepSize;
            renderBookingsPerFlight(bookingsPerFlightRows);
        });
    }

    if (bookingsPerFlightShowFewer) {
        bookingsPerFlightShowFewer.addEventListener("click", () => {
            visibleBookingsPerFlightCount = Math.max(initialReportLimit, visibleBookingsPerFlightCount - reportStepSize);
            renderBookingsPerFlight(bookingsPerFlightRows);
        });
    }

    if (popularRoutesShowMore) {
        popularRoutesShowMore.addEventListener("click", () => {
            visiblePopularRoutesCount += reportStepSize;
            renderPopularRoutes(popularRouteRows);
        });
    }

    if (popularRoutesShowFewer) {
        popularRoutesShowFewer.addEventListener("click", () => {
            visiblePopularRoutesCount = Math.max(initialReportLimit, visiblePopularRoutesCount - reportStepSize);
            renderPopularRoutes(popularRouteRows);
        });
    }

    loadAnalytics();
})();
