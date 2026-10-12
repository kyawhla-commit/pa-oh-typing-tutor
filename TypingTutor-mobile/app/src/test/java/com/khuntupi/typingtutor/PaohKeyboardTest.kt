package com.khuntupi.typingtutor

import org.junit.Assert.*
import org.junit.Test

class PaohKeyboardTest {
    @Test fun all47KeysMatchEverySuppliedXkbLevel() {
        val source = javaClass.getResource("/text.txt")!!.readText()
        val symbols = mapOf(
            "grave" to "`", "asciitilde" to "~", "exclam" to "!", "at" to "@",
            "numbersign" to "#", "dollar" to "$", "percent" to "%", "asciicircum" to "^",
            "ampersand" to "&", "asterisk" to "*", "parenleft" to "(", "parenright" to ")",
            "minus" to "-", "underscore" to "_", "equal" to "=", "plus" to "+",
            "bracketleft" to "[", "bracketright" to "]", "braceleft" to "{", "braceright" to "}",
            "semicolon" to ";", "colon" to ":", "apostrophe" to "'", "quotedbl" to "\"",
            "comma" to ",", "less" to "<", "period" to ".", "greater" to ">",
            "slash" to "/", "question" to "?", "backslash" to "\\", "bar" to "|",
        )
        val expected = Regex("key <(\\w+)>\\s*\\{\\s*\\[([^]]+)]").findAll(source).associate { match ->
            match.groupValues[1] to match.groupValues[2].split(',').map { token ->
                val value = token.trim()
                when {
                    value.matches(Regex("U[0-9A-F]+")) -> String(Character.toChars(value.drop(1).toInt(16)))
                    value.length == 1 -> value
                    else -> symbols.getValue(value)
                }
            }
        }
        val actual = PaohKeyboard.pages.flatten().associateBy { it.code }
        assertEquals(47, actual.size)
        assertEquals(expected.keys, actual.keys)
        expected.forEach { (code, levels) ->
            levels.forEachIndexed { level, output ->
                assertEquals("$code level ${level + 1}", output, actual.getValue(code).output(level % 2 == 1, level >= 2))
            }
        }
    }

    @Test fun hintsLocatePaohNumbersShiftAndLatinSymbols() {
        assertEquals("AE01", PaohKeyboard.locate("၁")!!.key.code)
        assertEquals(3, PaohKeyboard.locate("၁")!!.page)
        assertTrue(PaohKeyboard.locate("ရ")!!.shifted)
        assertTrue(PaohKeyboard.locate("1")!!.latin)
        assertTrue(PaohKeyboard.locate("@")!!.shifted)
        assertEquals("ABC · Shift + 2", PaohKeyboard.locate("@")!!.hint)
        assertFalse(PaohKeyboard.locate("-", preferLatin = false)!!.latin)
        assertTrue(PaohKeyboard.locate("-", preferLatin = true)!!.latin)
        assertNull(PaohKeyboard.locate(" "))
        assertNull(PaohKeyboard.locate("not a key"))
    }

    @Test fun punctuationWithoutExtraXkbLevelsIsStillAvailableInAbc() {
        val keys = PaohKeyboard.pages.flatten().associateBy { it.code }
        assertEquals("'", keys.getValue("AC11").output(false, true))
        assertEquals("?", keys.getValue("AB10").output(true, true))
        assertEquals("ꩻ", keys.getValue("AB08").output(false, false))
        assertEquals("ႏ", keys.getValue("AB09").output(false, false))
    }
}
