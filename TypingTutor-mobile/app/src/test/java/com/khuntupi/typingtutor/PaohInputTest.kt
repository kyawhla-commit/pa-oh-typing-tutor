package com.khuntupi.typingtutor

import org.junit.Assert.*
import org.junit.Test

class PaohInputTest {
    @Test fun insertionAndReplacementRespectCursorAndReversedSelection() {
        assertEquals(KeypadEdit("ဆနတ", 2), keypadEdit("ဆတ", 1, 1, "န"))
        assertEquals(KeypadEdit("ဆနမ", 2), keypadEdit("ဆတကမ", 3, 1, "န"))
    }

    @Test fun backspaceRemovesOnlyTheSelectedKeyOrPreviousCodePoint() {
        assertEquals(KeypadEdit("ဆတ", 1), keypadEdit("ဆိတ", 2, 2))
        assertEquals(KeypadEdit("ဆတ", 1), keypadEdit("ဆ😀တ", 3, 3))
        assertEquals(KeypadEdit("ဆ", 0), keypadEdit("ဆ", 0, 0))
        assertEquals(KeypadEdit("ဆမ", 1), keypadEdit("ဆတကမ", 3, 1))
    }

    @Test fun malformedSelectionCannotSplitSurrogatePairs() {
        assertEquals(KeypadEdit("ဆနတ", 2), keypadEdit("ဆ😀တ", 2, 2, "န"))
        assertEquals("က", targetKey("ဆကတ", "ဆ😀", 2))
        assertEquals("တ", targetKey("ဆကတ", "ဆ😀", 3))
    }

    @Test fun visibleMarkPlaceholderIsNeverInserted() {
        assertEquals("◌ိ", keyLabel("ိ"))
        assertEquals(KeypadEdit("ဆိ", 2), keypadEdit("ဆ", 1, 1, "ိ"))
        assertEquals("Space", keyLabel(" "))
    }

    @Test fun feedbackFindsFirstWrongOrExtraKey() {
        assertNull(firstMismatch("ဆိ", "ဆိတ"))
        assertEquals(1, firstMismatch("ဆီ", "ဆိတ"))
        assertEquals(2, firstMismatch("ဆိတ", "ဆိ"))
        assertEquals("ိ", targetKey("ဆိတ", "ဆီ", 1))
    }

    @Test fun everyPaohDrillKeyHasAKeypadLocation() {
        TutorContent.drills.filter { it.paoh }.forEach { drill ->
            drill.content.codePoints().toArray().filter { it != 32 }.forEach {
                val key = String(Character.toChars(it))
                assertNotNull("Missing key $key", keypadLocation(key))
            }
        }
        assertEquals(1 to true, keypadLocation("ီ"))
    }
}
