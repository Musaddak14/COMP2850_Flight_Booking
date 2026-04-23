package com.example.com.service

import com.example.com.ManagerAnalyticsResponse
import kotlinx.serialization.Serializable

class ManagerAnalyticsService {
    fun getAnalytics(): ManagerAnalyticsResponse {
        return ManagerAnalyticsResponse(
            totalBookings = 0,
            upcomingFlights = 0,
            openTickets = 0,
            mostPopularRoute = null,
            peakBookingTime = null
        )
    }
}
