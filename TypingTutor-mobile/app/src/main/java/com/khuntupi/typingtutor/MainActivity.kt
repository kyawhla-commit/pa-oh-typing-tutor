package com.khuntupi.typingtutor

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModelProvider
import com.khuntupi.typingtutor.ui.theme.TypingTutorTheme
import kotlinx.coroutines.delay
import java.text.DateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val model = ViewModelProvider(this)[TutorViewModel::class.java]
        setContent { TypingTutorTheme(darkTheme = model.darkMode, dynamicColor = false) { TutorApp(model) } }
    }
}

internal fun number(value: Double) = String.format(Locale.getDefault(), "%.0f", value)
internal fun accuracyLabel(value: Double) = String.format(Locale.getDefault(), "%.1f%%", kotlin.math.floor(value * 10) / 10)
private val tabs = listOf("Home", "Lessons", "Practice", "Test", "Progress")
private val symbols = listOf("⌂", "≡", "⌨", "◷", "↗")

@Composable
fun TutorApp(model: TutorViewModel) {
    var confirmExit by remember { mutableStateOf(false) }
    val session = model.session
    LaunchedEffect(session?.id) {
        while (model.session?.finished == false) { model.tick(); delay(200) }
    }
    BackHandler(session != null || model.tab != "Home") {
        if (session != null && !session.finished && session.startedAt != null) confirmExit = true
        else if (session != null) model.closeSession() else model.tab = "Home"
    }
    if (confirmExit) AlertDialog(
        onDismissRequest = { confirmExit = false }, title = { Text("Leave this attempt?") },
        text = { Text("This unfinished attempt will be discarded. Your completed practice is already saved.") },
        confirmButton = { TextButton(onClick = { model.closeSession(); confirmExit = false }) { Text("Leave") } },
        dismissButton = { TextButton(onClick = { confirmExit = false }) { Text("Keep typing") } },
    )
    Scaffold(bottomBar = {
        if (session == null) NavigationBar {
            tabs.forEachIndexed { index, tab -> NavigationBarItem(
                selected = model.tab == tab, onClick = { model.tab = tab },
                icon = { Text(symbols[index], style = MaterialTheme.typography.titleLarge) },
                label = { Text(tab, maxLines = 1) },
            ) }
        }
    }) { padding ->
        if (session?.paoh == true && !session.finished) {
            PaohPracticeScreen(model, session, Modifier.fillMaxSize().padding(padding).imePadding()) {
                if (session.startedAt != null) confirmExit = true else model.closeSession()
            }
        } else Column(Modifier.fillMaxSize().padding(padding).imePadding()) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Image(painterResource(R.drawable.app_logo), contentDescription = null, modifier = Modifier.size(32.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Pa-O · Typing Tutor", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("A little practice, every day.", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                TextButton(onClick = { model.setDark(!model.darkMode) }) { Text(if (model.darkMode) "Light" else "Dark") }
            }
            HorizontalDivider()
            val scrollState = key(session?.id ?: model.tab, session?.finished) { rememberScrollState() }
            Column(Modifier.fillMaxSize().verticalScroll(scrollState).padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                if (session != null) {
                    if (session.finished) ResultScreen(model, session)
                    else SessionScreen(model, session) {
                        if (session.startedAt != null) confirmExit = true else model.closeSession()
                    }
                } else when (model.tab) {
                    "Home" -> HomeScreen(model)
                    "Lessons" -> LessonsScreen(model)
                    "Practice" -> PracticeScreen(model)
                    "Test" -> TestScreen(model)
                    "Progress" -> ProgressScreen(model)
                }
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun PageHeading(eyebrow: String, title: String, description: String) {
    Text(eyebrow.uppercase(), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
    Text(title, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
    Text(description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun Stats(vararg values: Pair<String, String>) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        values.forEach { (value, label) ->
            Card(Modifier.weight(1f), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, maxLines = 1)
                    Text(label, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

@Composable
private fun HomeScreen(model: TutorViewModel) {
    PageHeading("Your daily rhythm", "Make every\nkeystroke count.", "Build confidence in English and Pa-O key drills. Practice offline, at your own pace.")
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Ready for a fresh start?", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text("A short practice is all it takes. Focus on accuracy; speed will follow.")
            Button(onClick = { model.start(TutorContent.drills.first()) }) { Text("Start practicing  →") }
        }
    }
    Stats("${model.history.size}" to "Saved attempts", "${model.completedLessons.size}/8" to "Lessons passed", number(model.history.filterNot { it.paoh }.maxOfOrNull { it.wpm } ?: 0.0) to "Best WPM")
    Text("Your next step", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
    val next = TutorContent.lessons.firstOrNull { it.id !in model.completedLessons }
    if (next != null) ActionCard(next.title, next.description, "Start lesson") { model.start(next, isLesson = true) }
    else ActionCard("Keep your rhythm", "You’ve passed the curriculum. Try a timed challenge.", "Take a test") { model.tab = "Test" }
    Text("Your practice stays on this device. No account or connection needed.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
private fun ActionCard(title: String, description: String, action: String, enabled: Boolean = true, onClick: () -> Unit) {
    OutlinedCard(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text(description, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            TextButton(onClick = onClick, enabled = enabled) { Text(action) }
        }
    }
}

@Composable
private fun LessonsScreen(model: TutorViewModel) {
    PageHeading("Step by step", "Find your flow.", "Eight lessons from the web curriculum. Pass with at least 95% attempt accuracy to unlock the next lesson.")
    TutorContent.lessons.forEach { lesson ->
        val passed = lesson.id in model.completedLessons
        val unlocked = lesson.id == 1 || lesson.id - 1 in model.completedLessons
        ActionCard("${lesson.id.toString().padStart(2, '0')}  ${lesson.title}${if (passed) "  ✓" else ""}", lesson.description,
            if (!unlocked) "Complete lesson ${lesson.id - 1} first" else if (passed) "Practice again" else "Begin lesson", unlocked) {
            model.start(lesson, isLesson = true)
        }
    }
}

@Composable
private fun PracticeScreen(model: TutorViewModel) {
    PageHeading("No pressure", "Practice your way.", "Choose a focused drill. Use your device keyboard, a physical keyboard, or the built-in Pa-O key pad.")
    TutorContent.drills.forEach { drill -> ActionCard(drill.title, drill.description, "Start drill") { model.start(drill) } }
}

@Composable
private fun TestScreen(model: TutorViewModel) {
    PageHeading("A personal benchmark", "Meet your pace.", "The clock starts with your first committed character. Type carefully until time runs out.")
    listOf(30, 60, 120).forEach { seconds ->
        ActionCard("$seconds seconds", if (seconds == 30) "A quick check-in." else if (seconds == 60) "Find a comfortable rhythm." else "Work on steady concentration.", "Start test") {
            model.start(TutorContent.drills.first(), duration = seconds)
        }
    }
    Text("WPM uses correct Unicode code points ÷ 5 per minute. Accuracy counts every inserted code point, including corrected mistakes. These are personal practice scores.", style = MaterialTheme.typography.bodySmall)
}

@Composable
private fun SessionScreen(model: TutorViewModel, session: TypingSession, onExit: () -> Unit) {
    var field by remember(session.id) { mutableStateOf(TextFieldValue(session.input, TextRange(session.input.length))) }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(session.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        TextButton(onClick = onExit) { Text("Leave") }
    }
    Stats(number(session.wpm(model.now) * if (session.paoh) 5 else 1) to if (session.paoh) "Keys/min" else "WPM", accuracyLabel(session.accuracy) to "Accuracy",
        (session.remainingSeconds(model.now)?.let { "${it}s" } ?: "${session.elapsedMillis(model.now) / 1000}s") to if (session.durationSeconds != null) "Remaining" else "Elapsed")
    if (session.startedAt == null) Text("The clock starts when you type. Match the passage exactly.", style = MaterialTheme.typography.bodySmall)
    val targetPoints = session.target.codePoints().toArray()
    val typedPoints = session.input.codePoints().toArray()
    val start = maxOf(0, typedPoints.size - 25)
    val end = minOf(targetPoints.size, start + 240)
    val highlighted = buildAnnotatedString {
        if (start > 0) append("… ")
        for (i in start until end) {
            val color = when {
                i >= typedPoints.size -> MaterialTheme.colorScheme.onSurface
                typedPoints[i] == targetPoints[i] -> MaterialTheme.colorScheme.primary
                else -> MaterialTheme.colorScheme.error
            }
            pushStyle(SpanStyle(color = color, background = if (i == typedPoints.size) MaterialTheme.colorScheme.primaryContainer else Color.Transparent))
            append(String(Character.toChars(targetPoints[i]))); pop()
        }
        if (end < targetPoints.size) append(" …")
    }
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Text(highlighted, Modifier.padding(18.dp).fillMaxWidth(), style = MaterialTheme.typography.titleMedium)
    }
    OutlinedTextField(value = field, onValueChange = { next ->
        field = next
        // IME pre-edit text is not scored until composition is committed.
        if (next.composition == null) {
            model.edit(next.text)
            val accepted = model.session?.input ?: next.text
            if (accepted != next.text) field = TextFieldValue(accepted, TextRange(accepted.length))
        }
    }, label = { Text("Type the passage here") },
        supportingText = { Text("Backspace to correct mistakes. Corrections still count toward accuracy.") },
        modifier = Modifier.fillMaxWidth(), minLines = 2, maxLines = 4,
        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.None, autoCorrectEnabled = false),
    )
    if (session.durationSeconds == null) LinearProgressIndicator(progress = { (typedPoints.size.toFloat() / targetPoints.size).coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth())
}

@Composable
private fun ResultScreen(model: TutorViewModel, session: TypingSession) {
    val passed = session.lessonId != null && session.accuracy >= 95
    PageHeading("Attempt saved", if (passed) "Lesson passed!" else "Every attempt counts.",
        if (session.lessonId != null && !passed) "Aim for 95% accuracy to pass this lesson. Take your time and try again." else "Your result is saved on this device. Keep showing up; steady practice makes a difference.")
    Stats(number(session.wpm(model.now) * if (session.paoh) 5 else 1) to if (session.paoh) "Keys/min" else "WPM", accuracyLabel(session.accuracy) to "Accuracy", "${session.elapsedMillis(model.now) / 1000}s" to "Duration")
    Text("${session.attempts - session.correctAttempts} incorrect insertions across ${session.attempts} attempts.", style = MaterialTheme.typography.bodyMedium)
    Button(onClick = { model.retry() }, modifier = Modifier.fillMaxWidth()) { Text("Try again") }
    OutlinedButton(onClick = { model.closeSession(); model.tab = "Progress" }, modifier = Modifier.fillMaxWidth()) { Text("See my progress") }
    if (passed) TutorContent.lessons.firstOrNull { it.id == session.lessonId!! + 1 }?.let { next ->
        TextButton(onClick = { model.start(next, isLesson = true) }) { Text("Next lesson: ${next.title}  →") }
    }
}

@Composable
private fun ProgressScreen(model: TutorViewModel) {
    var confirmReset by remember { mutableStateOf(false) }
    PageHeading("Small steps add up", "Look how far\nyou’ve come.", "Your latest 100 completed attempts are stored locally. Lesson passes stay saved even when older attempts roll off.")
    Stats(number(model.history.filterNot { it.paoh }.maxOfOrNull { it.wpm } ?: 0.0) to "Best WPM",
        accuracyLabel(if (model.history.isEmpty()) 0.0 else model.history.map { it.accuracy }.average()) to "Avg. accuracy",
        "${model.completedLessons.size}/8" to "Lessons")
    Text("Recent practice", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
    if (model.history.isEmpty()) ActionCard("Your story starts here", "Complete a practice or test to see your first result.", "Start practicing") { model.tab = "Practice" }
    model.history.forEach { result ->
        OutlinedCard(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(result.title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("${number(result.wpm * if (result.paoh) 5 else 1)} ${if (result.paoh) "keys/min" else "WPM"}  ·  ${accuracyLabel(result.accuracy)} accuracy  ·  ${result.seconds}s")
                Text(DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT).format(Date(result.timestamp)), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
    if (model.history.isNotEmpty() || model.completedLessons.isNotEmpty()) TextButton(onClick = { confirmReset = true }) { Text("Reset local progress", color = MaterialTheme.colorScheme.error) }
    if (confirmReset) AlertDialog(onDismissRequest = { confirmReset = false }, title = { Text("Reset progress?") },
        text = { Text("This deletes saved attempts and lesson passes from this device. This cannot be undone.") },
        confirmButton = { TextButton(onClick = { model.resetProgress(); confirmReset = false }) { Text("Reset") } },
        dismissButton = { TextButton(onClick = { confirmReset = false }) { Text("Cancel") } })
}
