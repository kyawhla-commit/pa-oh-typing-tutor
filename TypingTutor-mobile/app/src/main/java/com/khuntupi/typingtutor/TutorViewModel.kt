package com.khuntupi.typingtutor

import android.app.Application
import android.os.SystemClock
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

class TutorViewModel(application: Application) : AndroidViewModel(application) {
    private val preferences = application.getSharedPreferences("typing-tutor-v1", 0)
    var history by mutableStateOf(readHistory())
        private set
    // Completed lessons survive the bounded history rolling over.
    var completedLessons by mutableStateOf(preferences.getStringSet("lessons", emptySet())!!.mapNotNull { it.toIntOrNull() }.toSet())
        private set
    var darkMode by mutableStateOf(preferences.getBoolean("dark", false))
        private set
    var tab by mutableStateOf("Home")
    var session by mutableStateOf<TypingSession?>(null)
        private set
    var now by mutableLongStateOf(SystemClock.elapsedRealtime())
        private set

    fun setDark(enabled: Boolean) {
        darkMode = enabled
        preferences.edit().putBoolean("dark", enabled).apply()
    }

    fun start(lesson: Lesson, isLesson: Boolean = false, duration: Int? = null) {
        now = SystemClock.elapsedRealtime()
        session = TypingSession(UUID.randomUUID().toString(), if (duration != null) "$duration second test" else lesson.title,
            if (duration != null) TutorContent.testText else lesson.content,
            if (isLesson) lesson.id else null, duration, paoh = lesson.paoh)
    }

    fun edit(text: String) {
        now = SystemClock.elapsedRealtime()
        session = session?.edit(text, now)
        saveFinished()
    }

    fun tick() {
        now = SystemClock.elapsedRealtime()
        session = session?.tick(now)
        saveFinished()
    }

    fun closeSession() { session = null }

    fun retry() {
        session?.let { session = it.copy(id = UUID.randomUUID().toString(), input = "", startedAt = null, endedAt = null, attempts = 0, correctAttempts = 0) }
    }

    fun resetProgress() {
        history = emptyList()
        completedLessons = emptySet()
        preferences.edit().remove("history").remove("lessons").apply()
    }

    private fun saveFinished() {
        val active = session ?: return
        if (!active.finished || history.any { it.id == active.id }) return
        val result = SessionResult(active.id, active.title, System.currentTimeMillis(), active.wpm(now),
            active.accuracy, active.elapsedMillis(now) / 1000, active.attempts, active.lessonId, active.paoh)
        history = (listOf(result) + history).take(100)
        completedLessons = completedLessons + passedLessons(listOf(result))
        val json = JSONArray()
        history.forEach { r -> json.put(JSONObject().apply {
            put("id", r.id); put("title", r.title); put("time", r.timestamp)
            put("wpm", r.wpm); put("accuracy", r.accuracy); put("seconds", r.seconds)
            put("attempts", r.attempts); put("lesson", r.lessonId ?: JSONObject.NULL)
            put("paoh", r.paoh)
        }) }
        preferences.edit().putString("history", json.toString())
            .putStringSet("lessons", completedLessons.map { it.toString() }.toSet()).apply()
    }

    private fun readHistory(): List<SessionResult> = runCatching {
        val entries = JSONArray(preferences.getString("history", "[]"))
        (0 until minOf(entries.length(), 100)).mapNotNull { i -> runCatching {
            val r = entries.getJSONObject(i)
            SessionResult(r.getString("id"), r.getString("title"), r.getLong("time"),
                r.getDouble("wpm"), r.getDouble("accuracy"), r.getLong("seconds"),
                r.getInt("attempts"), if (r.isNull("lesson")) null else r.getInt("lesson"),
                r.optBoolean("paoh", r.getString("title") == "Pa-O key drill"))
        }.getOrNull() }
    }.getOrDefault(emptyList())
}
