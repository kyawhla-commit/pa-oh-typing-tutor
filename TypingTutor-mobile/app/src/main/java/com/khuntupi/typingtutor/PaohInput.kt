package com.khuntupi.typingtutor

/** UTF-16 selection offsets, as used by Android text fields. Never split a surrogate pair. */
data class KeypadEdit(val text: String, val cursor: Int)

fun keypadEdit(text: String, selectionStart: Int, selectionEnd: Int, insertion: String? = null): KeypadEdit {
    fun boundary(offset: Int, end: Boolean): Int {
        val index = offset.coerceIn(0, text.length)
        if (index in 1 until text.length && text[index].isLowSurrogate() && text[index - 1].isHighSurrogate()) return index + if (end) 1 else -1
        return index
    }
    var start = boundary(minOf(selectionStart, selectionEnd), false)
    val end = boundary(maxOf(selectionStart, selectionEnd), true)
    if (insertion == null && start == end && start > 0) start = text.offsetByCodePoints(start, -1)
    val replacement = insertion.orEmpty()
    return KeypadEdit(text.replaceRange(start, end, replacement), start + replacement.length)
}

fun keyLabel(key: String): String {
    if (key == " ") return "Space"
    if (key.isEmpty()) return "Done"
    val type = Character.getType(key.codePointAt(0))
    return if (type in listOf(Character.NON_SPACING_MARK.toInt(), Character.COMBINING_SPACING_MARK.toInt(), Character.ENCLOSING_MARK.toInt())) "◌$key" else key
}

fun firstMismatch(input: String, target: String): Int? {
    val actual = input.codePoints().toArray()
    val expected = target.codePoints().toArray()
    return actual.indices.firstOrNull { it >= expected.size || actual[it] != expected[it] }
}

fun targetKey(target: String, input: String, cursor: Int): String {
    var offset = cursor.coerceIn(0, input.length)
    if (offset in 1 until input.length && input[offset].isLowSurrogate() && input[offset - 1].isHighSurrogate()) offset--
    val index = input.codePointCount(0, offset)
    val points = target.codePoints().toArray()
    return if (index < points.size) String(Character.toChars(points[index])) else ""
}

fun keypadLocation(key: String): Pair<Int, Boolean>? {
    if (key.isEmpty() || key == " ") return null
    for (shifted in listOf(false, true)) {
        val rows = if (shifted) TutorContent.paohShiftRows else TutorContent.paohRows
        val index = rows.indexOfFirst { it.contains(key) }
        if (index >= 0) return index to shifted
    }
    return null
}
