package com.khuntupi.typingtutor

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class TutorAppTest {
    @get:Rule val compose = createEmptyComposeRule()

    @Before fun resetFixture() {
        InstrumentationRegistry.getInstrumentation().targetContext
            .getSharedPreferences("typing-tutor-v1", 0).edit().clear().commit()
    }

    @Test fun completeLessonPersistResultAndUnlockNextLesson() {
        ActivityScenario.launch(MainActivity::class.java).use { activity ->
            compose.onNode(hasText("Lessons") and hasClickAction()).performClick()
            compose.onNodeWithText("Begin lesson").performScrollTo().performClick()
            compose.onNode(hasSetTextAction()).performScrollTo()
                .performTextInput(TutorContent.lessons.first().content)
            compose.onNodeWithText("Lesson passed!").assertIsDisplayed()
            compose.onNodeWithText("See my progress").performScrollTo().performClick()
            compose.onNodeWithText("Home row").assertExists()
            activity.recreate()
            compose.onNodeWithText("Progress").performClick()
            compose.onNodeWithText("Home row").assertExists()
            compose.onNode(hasText("Lessons") and hasClickAction()).performClick()
            compose.onNodeWithText("01  Home row  ✓").assertExists()
            compose.onNodeWithText("Begin lesson").assertIsEnabled()
        }
        // A fresh ViewModel must reload completed history and lesson passes from storage.
        ActivityScenario.launch(MainActivity::class.java).use {
            compose.onNodeWithText("Progress").performClick()
            compose.onNodeWithText("Home row").assertExists()
            compose.onNode(hasText("Lessons") and hasClickAction()).performClick()
            compose.onNodeWithText("01  Home row  ✓").assertExists()
        }
    }

    private fun startPaoh(index: Int = 1) {
        compose.onNodeWithText("Practice").performClick()
        compose.onAllNodesWithText("Start drill")[index].performScrollTo().performClick()
    }

    private fun assertInput(text: String) {
        compose.onNodeWithTag("paoh-input").assert(
            SemanticsMatcher.expectValue(SemanticsProperties.EditableText, AnnotatedString(text)))
    }

    @Test fun paohPadCorrectsSelectedMistakeAndPreservesAccuracyAcrossRecreation() {
        ActivityScenario.launch(MainActivity::class.java).use { activity ->
            startPaoh()
            compose.onNodeWithTag("paoh-passage").assertIsDisplayed()
            compose.onNodeWithTag("paoh-key-တ").assertWidthIsAtLeast(48.dp)
                .assertHeightIsAtLeast(48.dp).performClick()
            assertInput("တ")
            compose.onNodeWithText("Fix mistake").performScrollTo().performClick()
            compose.onNodeWithTag("next-key").assertTextContains("ဆ", substring = true)
            compose.onNodeWithTag("paoh-key-ဆ").performClick()
            assertInput("ဆ")
            compose.onNodeWithText("50.0% accuracy").assertExists()
            activity.recreate()
            assertInput("ဆ")
            compose.onNodeWithText("Space").performClick()
            assertInput("ဆ ")
            compose.onNodeWithContentDescription("Backspace").performClick()
            assertInput("ဆ")
            compose.onNodeWithText("Leave").performClick()
            compose.onNodeWithText("Keep typing").assertIsDisplayed()
        }
    }

    @Test fun paohMarksUseRawUnicodeAndAutomaticallyFindShiftedKeys() {
        ActivityScenario.launch(MainActivity::class.java).use {
            startPaoh(4)
            compose.onNodeWithTag("paoh-key-ိ").assertTextContains("◌ိ").performClick()
            assertInput("ိ")
            compose.onNodeWithText("Space").performClick()
            compose.onNodeWithTag("paoh-key-ီ").assertIsDisplayed().performClick()
            assertInput("ိ ီ")
            compose.onNodeWithContentDescription("Backspace").performClick()
            assertInput("ိ ")
            compose.onNodeWithTag("paoh-key-ီ").performClick()
            for (key in TutorContent.drills.last().content.drop(3).map { it.toString() }) {
                if (key == " ") compose.onNodeWithText("Space").performClick()
                else compose.onNodeWithTag("paoh-key-$key").performClick()
            }
            compose.onNodeWithText("Every attempt counts.").assertExists()
            compose.onNodeWithText("Keys/min").assertExists()
        }
    }

    @Test fun phoneKeyboardCanReplaceInputAndReturnToPad() {
        ActivityScenario.launch(MainActivity::class.java).use {
            startPaoh()
            compose.onNodeWithText("Use phone keyboard").performScrollTo().performClick()
            compose.onNodeWithTag("paoh-input").performScrollTo().performTextInput("ဆ တ")
            assertInput("ဆ တ")
            compose.onNodeWithText("Use Pa-O keypad").performScrollTo().performClick()
            compose.onNodeWithTag("paoh-pad").assertIsDisplayed()
            compose.onNodeWithText("Space").performClick()
            assertInput("ဆ တ ")
        }
    }
}
