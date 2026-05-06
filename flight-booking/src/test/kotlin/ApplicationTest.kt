package com.example.com

import com.flightsystem.service.EncryptionService.generateSalt
import com.flightsystem.service.EncryptionService.hashPassword
import com.flightsystem.service.EncryptionService.verifyPassword
import com.flightsystem.service.LoyaltyService
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.server.testing.*
import java.util.Base64
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class ApplicationTest {
    @Test
    fun testRoot() =
        testApplication {
            application {
                module()
            }
            client.get("/").apply {
                assertEquals(HttpStatusCode.OK, status)
            }
        }
}

class EncryptionServiceTest {
    @Test
    fun generateSaltTest() {
        val salt1 = generateSalt()
        val salt2 = generateSalt()

        val decoded1 = Base64.getDecoder().decode(salt1)
        val decoded2 = Base64.getDecoder().decode(salt2)

        assertNotEquals(salt1, salt2)
        assertEquals(16, decoded1.size)
        assertEquals(16, decoded2.size)
    }

    @Test
    fun hashPasswordTestAndVerifyPassword() {
        val password1 = "example"
        val password2 = "password"

        val salt1 = generateSalt()
        val salt2 = generateSalt()

        val hashedPassword1 = hashPassword(password1, salt1)
        val hashedPassword1Copy = hashPassword(password1, salt1)
        val hashedPassword2 = hashPassword(password2, salt2)

        val mixedHashedPassword1 = hashPassword(password1, salt2)

        assertEquals(hashedPassword1, hashedPassword1Copy)

        assertTrue(verifyPassword(password1, hashedPassword1, salt1))
        assertFalse(verifyPassword("Wrong", hashedPassword1, salt1))
        assertTrue(verifyPassword(password2, hashedPassword2, salt2))
        assertNotEquals(password1, hashedPassword1)
        assertNotEquals(password2, hashedPassword2)
        assertNotEquals(hashedPassword1, mixedHashedPassword1)
    }
}

class LoyaltyServiceTest {
    val service = LoyaltyService()

    @Test
    fun applyDiscountTest() {
        val discounted1 = service.applyDiscount(200.00, 1000)
        val discounted2 = service.applyDiscount(200.00, 1000000)

        assertEquals(100.00, discounted1)
        assertEquals(0.0, discounted2)
        assertFailsWith(IllegalArgumentException::class) { service.applyDiscount(200.00, -1) }
        assertFailsWith(IllegalArgumentException::class) { service.applyDiscount(-200.00, 1) }
        assertFailsWith(IllegalArgumentException::class) { service.applyDiscount(-200.00, -1) }
    }
}
