package com.khuntupi.typingtutor

import org.junit.Assert.*
import org.junit.Test

class TypingEngineTest {
    private fun session(target: String = "abc", duration: Int? = null) = TypingSession("test", "Practice", target, durationSeconds = duration)

    @Test fun timerWaitsForFirstInputAndFreezesAtDeadline() {
        val idle = session(duration = 30).tick(90000)
        assertNull(idle.startedAt)
        val running = idle.edit("a", 100000)
        assertEquals(30, running.remainingSeconds(100000))
        val finished = running.tick(140000)
        assertEquals(130000L, finished.endedAt)
        assertEquals(0.4, finished.wpm(150000), 0.001)
        assertEquals(finished, finished.edit("abc", 160000))
    }

    @Test fun correctedMistakeStillReducesAccuracy() {
        val result = session().edit("x", 1000).edit("", 2000)
            .edit("a", 3000).edit("ab", 4000).edit("abc", 5000)
        assertTrue(result.finished)
        assertEquals(4, result.attempts)
        assertEquals(3, result.correctAttempts)
        assertEquals(75.0, result.accuracy, 0.001)
        assertEquals(9.0, result.wpm(999999), 0.001)
    }

    @Test fun deletingDoesNotAddAnAttemptOrResetTheClock() {
        val result = session().edit("ab", 1000).edit("a", 2000).edit("", 3000)
        assertEquals(2, result.attempts)
        assertEquals(1000L, result.startedAt)
        assertFalse(result.finished)
    }

    @Test fun matchingLengthWithMistakesDoesNotCompleteDrill() {
        val result = session().edit("abx", 1000)
        assertFalse(result.finished)
        assertTrue(result.edit("abc", 2000).finished)
    }

    @Test fun correctingInTheMiddleDoesNotRecountAnUnchangedSuffix() {
        val result = session("abcd").edit("axc", 1000).edit("abc", 2000)
        assertEquals(4, result.attempts)
        assertEquals(3, result.correctAttempts)
        assertEquals(75.0, result.accuracy, 0.001)
    }

    @Test fun timedPassageDoesNotFinishEarly() {
        val result = session(duration = 60).edit("abc", 1000)
        assertFalse(result.finished)
        assertTrue(result.tick(61000).finished)
    }

    @Test fun supplementaryUnicodeAndPaohMarksCountAsCodePoints() {
        val result = session("ဆꩻ😀").edit("ဆ", 1000).edit("ဆꩻ", 2000).edit("ဆꩻ😀", 3000)
        assertTrue(result.finished)
        assertEquals(3, result.attempts)
        assertEquals(3, result.correctCharacters)
        assertEquals(100.0, result.accuracy, 0.001)
    }

    @Test fun excessInputRemainsVisibleAndCountsAgainstAccuracy() {
        val result = session("😀x").edit("😀xyz", 1000)
        assertEquals("😀xyz", result.input)
        assertEquals(4, result.attempts)
        assertEquals(2, result.correctAttempts)
        assertFalse(result.finished)
        val corrected = result.edit("😀x", 2000)
        assertTrue(corrected.finished)
        assertEquals(50.0, corrected.accuracy, 0.001)
    }

    @Test fun editAtDeadlineIsNotScored() {
        val result = session(duration = 30).edit("a", 1000).edit("ab", 31000)
        assertTrue(result.finished)
        assertEquals("a", result.input)
        assertEquals(1, result.attempts)
    }

    @Test fun lessonThresholdIsInclusiveAndDoesNotPassPractice() {
        fun result(id: Int?, accuracy: Double) = SessionResult("id", "title", 0, 20.0, accuracy, 10, 20, id)
        assertEquals(setOf(2), passedLessons(listOf(result(1, 94.99), result(2, 95.0), result(null, 100.0))))
    }

    @Test fun paohRowsHaveMatchingShiftKeysAndDrillIsReachable() {
        assertEquals(TutorContent.paohRows.map { it.codePointCount(0, it.length) }, TutorContent.paohShiftRows.map { it.codePointCount(0, it.length) })
        val keys = (TutorContent.paohRows.joinToString("") + " ").codePoints().toArray().toSet()
        assertTrue(TutorContent.drills[1].content.codePoints().toArray().all { it in keys })
    }
}
