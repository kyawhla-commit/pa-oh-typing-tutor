package com.khuntupi.typingtutor

import kotlin.math.max

/** Scores Unicode code points. Attempts include mistakes later removed with backspace. */
data class TypingSession(
    val id: String,
    val title: String,
    val target: String,
    val lessonId: Int? = null,
    val durationSeconds: Int? = null,
    val input: String = "",
    val startedAt: Long? = null,
    val endedAt: Long? = null,
    val attempts: Int = 0,
    val correctAttempts: Int = 0,
    val paoh: Boolean = false,
) {
    val finished get() = endedAt != null
    val accuracy get() = if (attempts == 0) 100.0 else correctAttempts * 100.0 / attempts
    val correctCharacters get() = input.codePoints().toArray().zip(target.codePoints().toArray().asIterable()).count { it.first == it.second }

    fun elapsedMillis(now: Long): Long = startedAt?.let { max(0L, (endedAt ?: now) - it) } ?: 0L
    fun wpm(now: Long): Double = if (elapsedMillis(now) == 0L) 0.0 else correctCharacters / 5.0 / (elapsedMillis(now) / 60000.0)
    fun remainingSeconds(now: Long): Int? = durationSeconds?.let { max(0, it - (elapsedMillis(now) / 1000).toInt()) }

    fun tick(now: Long): TypingSession {
        if (finished || startedAt == null || durationSeconds == null) return this
        val deadline = startedAt + durationSeconds * 1000L
        return if (now >= deadline) copy(endedAt = deadline) else this
    }

    fun edit(text: String, now: Long): TypingSession {
        val current = tick(now)
        if (current.finished || text == input) return current
        val goal = target.codePoints().toArray()
        val next = text.codePoints().toArray()
        val previous = input.codePoints().toArray()
        var prefix = 0
        while (prefix < minOf(previous.size, next.size) && previous[prefix] == next[prefix]) prefix++
        var suffix = 0
        while (suffix < minOf(previous.size, next.size) - prefix && previous[previous.lastIndex - suffix] == next[next.lastIndex - suffix]) suffix++
        val added = next.size - prefix - suffix
        val correct = (prefix until next.size - suffix).count { it < goal.size && next[it] == goal[it] }
        val start = startedAt ?: if (added > 0) now else null
        val updated = copy(
            input = String(next, 0, next.size), startedAt = start,
            attempts = attempts + added, correctAttempts = correctAttempts + correct,
        )
        // Fixed drills complete on exact text; timed tests always run for their full duration.
        return if (durationSeconds == null && updated.input == target && start != null) updated.copy(endedAt = now) else updated
    }
}

data class Lesson(val id: Int, val title: String, val description: String, val content: String, val paoh: Boolean = false)

object TutorContent {
    // The English curriculum is shared with frontend/src/features/lessons/lessonContent.ts.
    val lessons = listOf(
        Lesson(1, "Home row", "Build a steady foundation with ASDF and JKL;.", "asdf jkl; asdf jkl; sad lad fall ask flask"),
        Lesson(2, "Top row", "Reach QWERTY and YUIOP with relaxed hands.", "qwer tyui op qwer tyui op type the top row with steady rhythm"),
        Lesson(3, "Bottom row", "Explore ZXCVB and NM with control.", "zxcv bnm zxcv bnm practice the bottom row with relaxed hands"),
        Lesson(4, "Common words", "Find your rhythm in everyday words.", "the quick brown fox jumps over the lazy dog while we practice common words"),
        Lesson(5, "Numbers & symbols", "Work carefully through numbers and punctuation.", "12345 67890 ! @ # $ % use the number row with careful accuracy"),
        Lesson(6, "Speed drills", "Keep accuracy as you pick up the pace.", "steady rhythm and accurate movement build speed through focused daily practice"),
        Lesson(7, "JavaScript", "Practice punctuation in a real code snippet.", "const greet = (name) => `Hello, \${name}!`; console.log(greet('world'));"),
        Lesson(8, "Python", "Practice code, indentation, and line breaks.", "def greet(name):\n    return f'Hello, {name}!'\n\nprint(greet('world'))"),
    )
    // Direct outputs match frontend/src/components/keyboardLayouts.ts (PaOh basic).
    val paohRows = listOf("ဆတနမအပကငသစဟဩ၏", "ေျိ်ါ့ြုူး'", "ဖထခလဘညာꩻႏ/")
    val paohShiftRows = listOf("ဈဝဣ၎ဤ၌ဥ၍ဿဏဧဪၑ", "ဗှီ္ွံဲဒဓဂ\"", "ဇဌဃဠယဉဦ၊။?")
    val drills = listOf(
        Lesson(101, "English words", "A short everyday passage", lessons[3].content),
        Lesson(102, "Pa-O key drill", "Find each key with a guided phone keypad", "ဆ တ န မ အ ပ က င သ စ ဟ ဩ ဆတ နမ အပ ကင သစ ဟဩ", paoh = true),
        Lesson(103, "Numbers & symbols", "Accuracy before speed", lessons[4].content),
        Lesson(104, "Code practice", "Punctuation and capitals", lessons[6].content),
        Lesson(105, "Pa-O marks", "Short key sequences for marks, tones, and Shift", "ိ ီ ု ူ ေ ဲ ် ꩻ ႏ", paoh = true),
    )
    val testText = (lessons[3].content + " " + lessons[5].content + " ").repeat(200)
}

data class SessionResult(
    val id: String, val title: String, val timestamp: Long,
    val wpm: Double, val accuracy: Double, val seconds: Long,
    val attempts: Int, val lessonId: Int?,
    val paoh: Boolean = false,
)

fun passedLessons(results: List<SessionResult>): Set<Int> = results
    .filter { it.lessonId != null && it.accuracy >= 95.0 }
    .mapNotNull { it.lessonId }.toSet()
