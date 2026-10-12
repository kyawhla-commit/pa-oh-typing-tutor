package com.khuntupi.typingtutor

/** Direct outputs from keyboard/text.txt, basic XKB levels 1–4. No IME reordering. */
data class PaohKey(val code: String, val legend: String, val plain: String, val shift: String,
    val latin: String = plain, val latinShift: String = shift) {
    fun output(shifted: Boolean, abc: Boolean) = if (abc) {
        if (shifted) latinShift else latin
    } else if (shifted) shift else plain
}

data class KeyLocation(val page: Int, val shifted: Boolean, val latin: Boolean, val key: PaohKey) {
    val hint get() = (if (latin) "ABC · " else "") + (if (shifted) "Shift + " else "") + key.legend
}

object PaohKeyboard {
    val pageNames = listOf("Keys", "Marks", "More", "123")
    val pages = listOf(
        listOf(
            PaohKey("AD01", "Q", "ဆ", "ဈ", "q", "Q"),
            PaohKey("AD02", "W", "တ", "ဝ", "w", "W"),
            PaohKey("AD03", "E", "န", "ဣ", "e", "E"),
            PaohKey("AD04", "R", "မ", "၎", "r", "R"),
            PaohKey("AD05", "T", "အ", "ဤ", "t", "T"),
            PaohKey("AD06", "Y", "ပ", "၌", "y", "Y"),
            PaohKey("AD07", "U", "က", "ဥ", "u", "U"),
            PaohKey("AD08", "I", "င", "၍", "i", "I"),
            PaohKey("AD09", "O", "သ", "ဿ", "o", "O"),
            PaohKey("AD10", "P", "စ", "ဏ", "p", "P"),
            PaohKey("AD11", "[", "ဟ", "ဧ", "[", "{"),
            PaohKey("AD12", "]", "ဩ", "ဪ", "]", "}"),
            PaohKey("BKSL", "\\", "၏", "ၑ", "\\", "|"),
        ),
        listOf(
            PaohKey("AC01", "A", "ေ", "ဗ", "a", "A"),
            PaohKey("AC02", "S", "ျ", "ှ", "s", "S"),
            PaohKey("AC03", "D", "ိ", "ီ", "d", "D"),
            PaohKey("AC04", "F", "်", "္", "f", "F"),
            PaohKey("AC05", "G", "ါ", "ွ", "g", "G"),
            PaohKey("AC06", "H", "့", "ံ", "h", "H"),
            PaohKey("AC07", "J", "ြ", "ဲ", "j", "J"),
            PaohKey("AC08", "K", "ု", "ဒ", "k", "K"),
            PaohKey("AC09", "L", "ူ", "ဓ", "l", "L"),
            PaohKey("AC10", ";", "း", "ဂ", ";", ":"),
            PaohKey("AC11", "'", "'", "\""),
        ),
        listOf(
            PaohKey("AB01", "Z", "ဖ", "ဇ", "z", "Z"),
            PaohKey("AB02", "X", "ထ", "ဌ", "x", "X"),
            PaohKey("AB03", "C", "ခ", "ဃ", "c", "C"),
            PaohKey("AB04", "V", "လ", "ဠ", "v", "V"),
            PaohKey("AB05", "B", "ဘ", "ယ", "b", "B"),
            PaohKey("AB06", "N", "ည", "ဉ", "n", "N"),
            PaohKey("AB07", "M", "ာ", "ဦ", "m", "M"),
            PaohKey("AB08", ",", "ꩻ", "၊", ",", "<"),
            PaohKey("AB09", ".", "ႏ", "။", ".", ">"),
            PaohKey("AB10", "/", "/", "?"),
        ),
        listOf(
            PaohKey("TLDE", "`", "ၐ", "ဎ", "`", "~"),
            PaohKey("AE01", "1", "၁", "ဍ", "1", "!"),
            PaohKey("AE02", "2", "၂", "ၒ", "2", "@"),
            PaohKey("AE03", "3", "၃", "ဋ", "3", "#"),
            PaohKey("AE04", "4", "၄", "ၓ", "4", "\$"),
            PaohKey("AE05", "5", "၅", "ၔ", "5", "%"),
            PaohKey("AE06", "6", "၆", "ၕ", "6", "^"),
            PaohKey("AE07", "7", "၇", "ရ", "7", "&"),
            PaohKey("AE08", "8", "၈", "*", "8", "*"),
            PaohKey("AE09", "9", "၉", "(", "9", "("),
            PaohKey("AE10", "0", "၀", ")", "0", ")"),
            PaohKey("AE11", "-", "-", "_", "-", "_"),
            PaohKey("AE12", "=", "=", "+", "=", "+"),
        ),
    )

    fun locate(text: String, preferLatin: Boolean = false): KeyLocation? {
        if (text.isEmpty() || text == " ") return null
        for (latin in listOf(preferLatin, !preferLatin)) for (shifted in listOf(false, true)) {
            pages.forEachIndexed { page, keys ->
                keys.firstOrNull { it.output(shifted, latin) == text }?.let {
                    return KeyLocation(page, shifted, latin, it)
                }
            }
        }
        return null
    }
}
