package com.flightsystem.model
import kotlinx.serialization.Serializable

/**
 * represents the available seat classes for flight bookings
 */

@Serializable
enum class SeatClass {
    ECONOMY,
    PREMIUM_ECONOMY,
    BUSINESS,
}
