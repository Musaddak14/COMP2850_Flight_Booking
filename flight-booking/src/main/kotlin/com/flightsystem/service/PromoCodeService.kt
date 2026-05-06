package com.flightsystem.service

import com.flightsystem.model.PromoCode
import com.flightsystem.model.PromoCodeUsages
import com.flightsystem.model.PromoCodes
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.and
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.update
import java.time.LocalDateTime

class PromoCodeService {
    fun makeDefaultPromoCodes() {
        transaction {
            insertPromoCodeIfMissing("WELCOME10", "PERCENTAGE", 10.0)
            insertPromoCodeIfMissing("SAVE20", "FIXED", 20.0)
            insertPromoCodeIfMissing("SUMMER15", "PERCENTAGE", 15.0)
        }
    }

    private fun insertPromoCodeIfMissing(
        codeValue: String,
        discountTypeValue: String,
        discountValueAmount: Double,
    ) {
        val existing =
            PromoCodes
                .selectAll()
                .where { PromoCodes.code eq codeValue }
                .singleOrNull()

        if (existing == null) {
            PromoCodes.insert {
                it[code] = codeValue
                it[discountType] = discountTypeValue
                it[discountValue] = discountValueAmount
                it[isActive] = true
            }
        }
    }

    fun getPromoCode(codeValue: String): PromoCode? =
        transaction {
            PromoCodes
                .selectAll()
                .where { PromoCodes.code eq codeValue.uppercase() }
                .singleOrNull()
                ?.let {
                    PromoCode(
                        code = it[PromoCodes.code],
                        discountType = it[PromoCodes.discountType],
                        discountValue = it[PromoCodes.discountValue],
                        isActive = it[PromoCodes.isActive],
                    )
                }
        }

    fun createPromoCode(
        codeValue: String,
        discountType: String,
        discountValue: Double,
    ): Result<Unit> {
        if (codeValue.isBlank()) {
            return Result.failure(IllegalArgumentException("PromoCode cannot be empty."))
        }

        if (discountType != "PERCENTAGE" && discountType != "FIXED") {
            return Result.failure(IllegalArgumentException("Invalid discount type"))
        }

        if (discountValue <= 0) {
            return Result.failure(IllegalArgumentException("Discount value must be 0 or greater"))
        }

        return transaction {
            PromoCodes.insert {
                it[code] = codeValue.uppercase()
                it[PromoCodes.discountType] = discountType
                it[PromoCodes.discountValue] = discountValue
                it[isActive] = true
            }
            Result.success(Unit)
        }
    }

    fun deactivatePromoCode(codeValue: String): Boolean =
        transaction {
            PromoCodes.update({ PromoCodes.code eq codeValue.uppercase() }) {
                it[isActive] = false
            } > 0
        }

    fun applyPromoCode(
        codeValue: String,
        originalAmount: Double,
    ): Result<Double> {
        val promo =
            getPromoCode(codeValue) ?: return Result.failure(IllegalArgumentException("PromoCode cannot be found."))

        if (!promo.isActive) {
            return Result.failure(IllegalArgumentException("PromoCode is not active"))
        }

        val discountedAmount =
            when (promo.discountType) {
                "PERCENTAGE" -> {
                    val discount = originalAmount * (promo.discountValue / 100.0)
                    originalAmount - discount
                }

                "FIXED" -> {
                    originalAmount - promo.discountValue
                }

                else -> {
                    return Result.failure(IllegalArgumentException("Invalid promo code type"))
                }
            }

        return Result.success(discountedAmount.coerceAtLeast(0.0))
    }

    fun hasUserUsedPromoCode(
        userId: Int,
        codeValue: String,
    ): Boolean =
        transaction {
            PromoCodeUsages
                .selectAll()
                .where {
                    (PromoCodeUsages.userId eq userId) and
                        (PromoCodeUsages.promoCode eq codeValue.uppercase())
                }.singleOrNull() != null
        }

    fun recordPromoCodeUsage(
        userId: Int,
        codeValue: String,
    ) {
        transaction {
            PromoCodeUsages.insert {
                it[PromoCodeUsages.userId] = userId
                it[promoCode] = codeValue.uppercase()
                it[usedAt] = LocalDateTime.now().toString()
            }
        }
    }
}
