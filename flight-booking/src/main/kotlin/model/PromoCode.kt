package com.flightsystem.model

import kotlinx.serialization.Serializable
import org.jetbrains.exposed.sql.Table


@Serializable
data class PromoCode(
    val code: String,
    val discountType: String,
    val discountValue: Double,
    val isActive: Boolean
)

object PromoCodes : Table() {
    val code = varchar("code", 50)
    val discountType = varchar("discountType", 20)
    val discountValue = double("discountValue")
    val isActive = bool("isActive").default(true)

    override val primaryKey = PrimaryKey(code)
}
