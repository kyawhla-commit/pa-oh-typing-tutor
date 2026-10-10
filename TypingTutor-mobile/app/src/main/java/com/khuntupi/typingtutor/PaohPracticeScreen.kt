package com.khuntupi.typingtutor

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.*
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PaohPracticeScreen(model: TutorViewModel, session: TypingSession, modifier: Modifier = Modifier, onExit: () -> Unit) {
    var field by rememberSaveable(session.id, stateSaver = TextFieldValue.Saver) {
        mutableStateOf(TextFieldValue(session.input, TextRange(session.input.length)))
    }
    var phoneKeyboard by rememberSaveable(session.id) { mutableStateOf(false) }
    var hints by rememberSaveable(session.id) { mutableStateOf(true) }
    var group by rememberSaveable(session.id) { mutableIntStateOf(0) }
    var shifted by rememberSaveable(session.id) { mutableStateOf(false) }
    val keyboard = LocalSoftwareKeyboardController.current
    val focus = LocalFocusManager.current
    val requester = remember { FocusRequester() }
    val haptics = LocalHapticFeedback.current
    val next = targetKey(session.target, field.text, field.selection.min)
    val mismatch = firstMismatch(session.input, session.target)

    LaunchedEffect(next, hints) {
        if (hints) keypadLocation(next)?.let { (page, shift) -> group = page; shifted = shift }
    }
    LaunchedEffect(phoneKeyboard) {
        if (phoneKeyboard) { requester.requestFocus(); keyboard?.show() }
        else { keyboard?.hide(); focus.clearFocus() }
    }

    fun commit(value: TextFieldValue) {
        field = value
        if (value.composition == null) {
            model.edit(value.text)
            val accepted = model.session?.input.orEmpty()
            if (accepted != value.text) field = TextFieldValue(accepted, TextRange(accepted.length))
        }
    }
    fun press(key: String?) {
        val edit = keypadEdit(field.text, field.selection.start, field.selection.end, key)
        commit(TextFieldValue(edit.text, TextRange(edit.cursor)))
        haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
    }

    @Composable fun PracticeContent(contentModifier: Modifier) {
        Column(contentModifier.verticalScroll(rememberScrollState()).padding(horizontal = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${accuracyLabel(session.accuracy)} accuracy", style = MaterialTheme.typography.labelLarge)
                Text("${number(session.wpm(model.now) * 5)} keys/min", style = MaterialTheme.typography.labelLarge)
                Text("${session.elapsedMillis(model.now) / 1000}s", style = MaterialTheme.typography.labelLarge)
            }
            if (hints) Text("Next: ${keyLabel(next)}", Modifier.testTag("next-key").semantics { liveRegion = LiveRegionMode.Polite },
                color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            // Keep Myanmar shaping intact: do not split combining sequences into colored spans.
            Surface(shape = MaterialTheme.shapes.medium, color = MaterialTheme.colorScheme.surfaceVariant) {
                Text(session.target, Modifier.fillMaxWidth().padding(12.dp).testTag("paoh-passage"), fontSize = 22.sp, lineHeight = 34.sp)
            }
            OutlinedTextField(value = field, onValueChange = { commit(it) },
                modifier = Modifier.fillMaxWidth().focusRequester(requester).testTag("paoh-input"),
                label = { Text("Your typing") }, readOnly = !phoneKeyboard, minLines = 1, maxLines = 2,
                textStyle = MaterialTheme.typography.titleLarge.copy(lineHeight = 34.sp),
                isError = mismatch != null && field.composition == null,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.None, autoCorrectEnabled = false))
            if (field.composition != null) Text("Finish composing to check your typing.", style = MaterialTheme.typography.bodySmall)
            else if (mismatch != null) {
                val expected = session.target.codePoints().toArray().getOrNull(mismatch)?.let { String(Character.toChars(it)) }
                Row(Modifier.fillMaxWidth()) {
                    Text(if (expected == null) "Extra key at position ${mismatch + 1}." else "Position ${mismatch + 1}: expected ${keyLabel(expected)}.",
                        Modifier.weight(1f).semantics { liveRegion = LiveRegionMode.Polite }, color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium)
                    TextButton(onClick = {
                        val start = session.input.offsetByCodePoints(0, mismatch)
                        val end = session.input.offsetByCodePoints(start, 1)
                        field = TextFieldValue(session.input, TextRange(start, end))
                    }) { Text("Fix mistake") }
                }
            } else Text(if (session.input.isEmpty()) "Tap the keys below. The clock starts with your first key." else "Matching so far. Corrections keep earlier mistakes in your accuracy.", style = MaterialTheme.typography.bodySmall)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                TextButton(onClick = {
                    // Commit an IME pre-edit once when deliberately switching away from it.
                    if (field.composition != null) commit(field.copy(composition = null))
                    phoneKeyboard = !phoneKeyboard
                }) { Text(if (phoneKeyboard) "Use Pa-O keypad" else "Use phone keyboard") }
                FilterChip(selected = hints, onClick = { hints = !hints }, label = { Text("Hints") })
            }
            Text("Key drills • accuracy before speed", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(4.dp))
        }
    }

    @Composable fun Pad(padModifier: Modifier) {
        Surface(padModifier.testTag("paoh-pad"), tonalElevation = 2.dp) {
            Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 12.dp, vertical = 4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    listOf("Letters", "Marks", "More").forEachIndexed { index, title ->
                        FilterChip(selected = group == index, onClick = { group = index }, label = { Text(title) }, modifier = Modifier.weight(1f))
                    }
                }
                val keys = (if (shifted) TutorContent.paohShiftRows else TutorContent.paohRows)[group].codePoints().toArray().map { String(Character.toChars(it)) }
                BoxWithConstraints(Modifier.fillMaxWidth()) {
                    // Each key remains at least 48 dp wide, including on a 320 dp phone.
                    val columns = (maxWidth.value / 56).toInt().coerceIn(1, 6)
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        keys.chunked(columns).forEach { row ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                row.forEach { key ->
                                    val suggested = hints && key == next
                                    FilledTonalButton(onClick = { press(key) },
                                        modifier = Modifier.weight(1f).heightIn(min = 52.dp).testTag("paoh-key-$key").semantics { contentDescription = "Type ${keyLabel(key)}" },
                                        contentPadding = PaddingValues(2.dp), shape = MaterialTheme.shapes.small,
                                        border = if (suggested) BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else null,
                                        colors = ButtonDefaults.filledTonalButtonColors(containerColor = if (suggested) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface)) {
                                        Text(keyLabel(key), fontSize = 24.sp, lineHeight = 34.sp)
                                    }
                                }
                                repeat(columns - row.size) { Spacer(Modifier.weight(1f)) }
                            }
                        }
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { shifted = !shifted }, modifier = Modifier.heightIn(min = 48.dp), contentPadding = PaddingValues(horizontal = 12.dp)) { Text(if (shifted) "Shift on" else "Shift") }
                    FilledTonalButton(onClick = { press(" ") }, modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                        border = if (hints && next == " ") BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else null) { Text("Space") }
                    OutlinedButton(onClick = { press(null) }, enabled = field.selection.max > 0,
                        modifier = Modifier.heightIn(min = 48.dp).semantics { contentDescription = "Backspace" }, contentPadding = PaddingValues(horizontal = 12.dp)) { Text("⌫") }
                }
            }
        }
    }

    BoxWithConstraints(modifier) {
        val wide = maxWidth >= 600.dp && maxWidth > maxHeight
        val padMaxHeight = maxHeight * 0.62f
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp)) {
                Text(session.title, Modifier.weight(1f).padding(vertical = 12.dp), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                TextButton(onClick = onExit) { Text("Leave") }
            }
            if (wide && !phoneKeyboard) Row(Modifier.weight(1f)) {
                PracticeContent(Modifier.weight(1f).fillMaxHeight())
                Pad(Modifier.weight(1f).fillMaxHeight())
            } else {
                PracticeContent(Modifier.weight(1f).fillMaxWidth())
                if (!phoneKeyboard) Pad(Modifier.fillMaxWidth().heightIn(max = padMaxHeight))
            }
        }
    }
}
