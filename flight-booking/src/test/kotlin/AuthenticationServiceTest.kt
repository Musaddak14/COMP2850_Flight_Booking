package com.flightsystem.service

import com.flightsystem.model.AccountStatus
import com.flightsystem.model.Manager
import com.flightsystem.model.Users
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import kotlin.test.Test
import kotlin.test.BeforeTest
import kotlin.test.AfterTest
import kotlin.test.*


class AuthenticationServiceTest {
    private lateinit var authService: AuthenticationService

    @BeforeTest
    fun setup() {
        Database.connect(
            url = "jdbc:h2:mem:test;DB_CLOSE_DELAY=-1;",
            driver = "org.h2.Driver"
        )

        transaction {
            SchemaUtils.create(Users)
            // if LoyaltyService uses another table, add it here too, for example:
            // SchemaUtils.create(LoyalAccounts)
            Users.deleteAll()
        }

        authService = AuthenticationService(sessionTimeout = 30L)
    }

    @AfterTest
    fun tearDown() {
        transaction {
            SchemaUtils.drop(Users)
        }
    }

    @Test
    fun `register succeeds with valid details`() {
        val result = authService.register(
            firstName = "John",
            lastName = "Smith",
            dateOfBirth = "2000-01-01",
            email = "john@test.com",
            password = "password123"
        )
        assertTrue(result.isSuccess)

        val user = result.getOrThrow()
        assertEquals("John", user.firstName)
        assertEquals("Smith", user.lastName)
        assertEquals("john@test.com", user.email)

        // verify password was stored correctly indirectly
        val loginResult = authService.login(
            "john@test.com",
            "password123"
        )
        assertTrue(loginResult.isSuccess)
    }

    @Test
    fun `register fails when first name is blank`() {
        val result = authService.register(
            firstName = "",
            lastName = "Smith",
            dateOfBirth = "2000-01-01",
            email = "john@test.com",
            password = "password123"
        )
        assertTrue(result.isFailure)
    }

    @Test
    fun `register fails with invalid email`() {
        val result = authService.register(
            firstName = "John",
            lastName = "Smith",
            dateOfBirth = "2000-01-01",
            email = "invalid-email",
            password = "password123"
        )
        assertTrue(result.isFailure)
    }

    @Test
    fun `register fails when password is too short`() {
        val result = authService.register(
            firstName = "John",
            lastName = "Smith",
            dateOfBirth = "2000-01-01",
            email = "john@test.com",
            password = "short"
        )
        assertTrue(result.isFailure)
    }

    @Test
    fun `register fails when email already exists`() {
        val result = authService.register(
            "John",
            lastName = "Smith",
            "2000-01-01",
            "john@test.com",
            "password123"
        )

        val duplicateResult = authService.register(
            "Jane",
            "Brown",
            "2001-02-02",
            "john@test.com",
            "password456"
        )
        assertTrue(duplicateResult.isFailure)
    }

    @Test
    fun `registerManager creates manager account`() {
        val result = authService.registerManager(
            firstName = "Admin",
            lastName = "User",
            dateOfBirth = "1990-01-01",
            email = "admin@test.com",
            rawPassword = "password123"
        )
        assertTrue(result.isSuccess)

        val manager = result.getOrThrow()
        assertTrue(manager is Manager)
        assertEquals("admin@test.com", manager.email)

        val role = transaction {
            Users
                .selectAll()
                .where { Users.email eq "admin@test.com" }
                .single()[Users.role]
        }
        assertEquals("MANAGER", role)
    }

    @Test
    fun `login succeeds with correct password`() {
        authService.register(
            "John",
            "Smith",
            "2000--01-01",
            "john@test.com",
            "password123"
        )
        val result = authService.login("john@test.com", "password123")

        assertTrue(result.isSuccess)
        assertEquals("john@test.com", result.getOrThrow().email)
    }

    @Test
    fun `login fails when user doesn't exist`() {
        val result = authService.login("missing@test", "password123")
        assertTrue(result.isFailure)
    }

    @Test
    fun `login fails with incorrect password`() {
        authService.register(
            "John",
            "Smith",
            "2000-01-01",
            "john@test.com",
            "password123"
        )

        val result = authService.login("john@test.com", "wrongpassword")
        assertTrue(result.isFailure)
    }

    @Test
    fun `failed login increments failed attempts`() {
        authService.register(
            "John",
            "Smith",
            "2000--01-01",
            "john@test.com",
            "password123"
        )
        authService.login("john@test.com", "wrongpassword")

        val attempts = transaction {
            Users
                .selectAll()
                .where { Users.email eq "john@test.com" }
                .single()[Users.failedLoginAttempts]
        }
        assertEquals(1, attempts)
    }

    @Test
    fun `account locks after 5 failed attempts`() {
        authService.register(
            "John",
            "Smith",
            "2000-01-01",
            "john@test.com",
            "password123"
        )

        repeat(5) {
            authService.login("john@test.com", "wrongpassword")
        }

        val isLocked = transaction {
            Users
                .selectAll()
                .where { Users.email eq "john@test.com" }
                .single()[Users.accountLocked]
        }
        assertTrue(isLocked)
    }

    @Test
    fun `createSession creates valid session`() {
        val user = authService.register(
            "John",
            "Smith",
            "2000-01-01",
            "john@test.com",
            "password123"
        ).getOrThrow()

        val sessionId = authService.createSession(user)

        assertTrue(sessionId.isNotBlank())

        val sessionUser = authService.validateSession(sessionId)
        assertNotNull(sessionUser)
        assertEquals(user.email, sessionUser.email)
    }

    @Test
    fun `validateSession returns null for invalid session`() {
        val user = authService.validateSession("fake-session-id")

        assertNull(user)
    }

    @Test
    fun `logout invalidates session`() {
        val user = authService.register(
            "John",
            "Smith",
            "2000-01-01",
            "john@test.com",
            "password123"
        ).getOrThrow()

        val sessionId = authService.createSession(user)

        authService.logout(sessionId)

        assertNull(authService.validateSession(sessionId))
    }

    @Test
    fun `isManagerSession returns true for manager`() {
        val manager = authService.registerManager(
            "Admin",
            "User",
            "1990-01-01",
            "admin@test.com",
            "password123"
        ).getOrThrow()

        val sessionId = authService.createSession(manager)

        assertTrue(authService.isManagerSession(sessionId))
    }

    @Test
    fun `isManagerSession returns false for normal user`() {
        val user = authService.register(
            "John",
            "Smith",
            "2000-01-01",
            "john@test.com",
            "password123"
        ).getOrThrow()

        val sessionId = authService.createSession(user)

        assertFalse(authService.isManagerSession(sessionId))
    }

    @Test
    fun `createOtpChallenge returns six digit otp`() {
        val user = authService.register(
            "John",
            "Smith",
            "2000-01-01",
            "john@test.com",
            "password123"
        ).getOrThrow()

        val otp = authService.createOtpChallenge(user)

        assertTrue(otp.matches(Regex("\\d{6}")))
    }

    @Test
    fun `verifyOtp succeeds with correct otp`() {
        val user = authService.register(
            "John",
            "Smith",
            "2000-01-01",
            "john@test.com",
            "password123"
        ).getOrThrow()

        val otp = authService.createOtpChallenge(user)

        val result = authService.verifyOtp(user.email, otp)

        assertTrue(result.isSuccess)
        assertEquals(user.email, result.getOrThrow().email)
    }

    @Test
    fun `verifyOtp fails with incorrect otp`() {
        val user = authService.register(
            "John",
            "Smith",
            "2000-01-01",
            "john@test.com",
            "password123"
        ).getOrThrow()

        authService.createOtpChallenge(user)

        val result = authService.verifyOtp(user.email, "000000")

        assertTrue(result.isFailure)
    }

    @Test
    fun `otp cannot be reused`() {
        val user = authService.register(
            "John",
            "Smith",
            "2000-01-01",
            "john@test.com",
            "password123"
        ).getOrThrow()

        val otp = authService.createOtpChallenge(user)

        val firstResult = authService.verifyOtp(user.email, otp)
        val secondResult = authService.verifyOtp(user.email, otp)

        assertTrue(firstResult.isSuccess)
        assertTrue(secondResult.isFailure)
    }

    @Test
    fun `resetPassword changes password`() {
        val user = authService.register(
            "John",
            "Smith",
            "2000-01-01",
            "john@test.com",
            "password123"
        ).getOrThrow()

        val resetResult = authService.resetPassword(user, "newpassword123")

        assertTrue(resetResult.isSuccess)

        val oldLogin = authService.login("john@test.com", "password123")
        val newLogin = authService.login("john@test.com", "newpassword123")

        assertTrue(oldLogin.isFailure)
        assertTrue(newLogin.isSuccess)
    }

    @Test
    fun `resetPassword fails when new password is too short`() {
        val user = authService.register(
            "John",
            "Smith",
            "2000-01-01",
            "john@test.com",
            "password123"
        ).getOrThrow()

        val result = authService.resetPassword(user, "short")

        assertTrue(result.isFailure)
    }

    @Test
    fun `findByEmail returns user when email exists`() {
        authService.register(
            "John",
            "Smith",
            "2000-01-01",
            "john@test.com",
            "password123"
        )

        val user = authService.findByEmail("john@test.com")

        assertNotNull(user)
        assertEquals("john@test.com", user.email)
    }

    @Test
    fun `findByEmail returns null when email does not exist`() {
        val user = authService.findByEmail("missing@test.com")

        assertNull(user)
    }

    @Test
    fun `getAllUsers returns registered users`() {
        authService.register(
            "John",
            "Smith",
            "2000-01-01",
            "john@test.com",
            "password123"
        )

        authService.register(
            "Jane",
            "Brown",
            "2001-02-02",
            "jane@test.com",
            "password456"
        )

        val users = authService.getAllUsers()

        assertEquals(2, users.size)
    }

    @Test
    fun `setDefaultManager creates manager`() {
        authService.setDefaultManager(
            firstName = "Default",
            lastName = "Manager",
            dateOfBirth = "1980-01-01",
            email = "manager@test.com",
            rawPassword = "password123"
        )

        val user = authService.findByEmail("manager@test.com")

        assertNotNull(user)
        assertTrue(user is Manager)
    }

    @Test
    fun `setDefaultManager does not duplicate existing manager`() {
        authService.setDefaultManager(
            "Default",
            "Manager",
            "1980-01-01",
            "manager@test.com",
            "password123"
        )

        authService.setDefaultManager(
            "Default",
            "Manager",
            "1980-01-01",
            "manager@test.com",
            "password123"
        )

        val users = authService.getAllUsers()

        assertEquals(1, users.size)
    }
}

