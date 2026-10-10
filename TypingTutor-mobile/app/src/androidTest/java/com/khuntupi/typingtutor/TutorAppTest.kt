package com.khuntupi.typingtutor

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.text.AnnotatedString
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

    @Test fun paohPadCanTypeAndCorrectWithoutADeviceIme() {
        ActivityScenario.launch(MainActivity::class.java).use {
            compose.onNodeWithText("Practice").performClick()
            compose.onAllNodesWithText("Start drill")[1].performScrollTo().performClick()
            compose.onNodeWithText("ဆ", useUnmergedTree = true).performScrollTo().performClick()
            compose.onNode(hasSetTextAction()).assertTextContains("ဆ")
            compose.onNodeWithText("⌫").performScrollTo().performClick()
            compose.onNode(hasSetTextAction()).assert(SemanticsMatcher.expectValue(SemanticsProperties.EditableText, AnnotatedString("")))
            compose.onNodeWithText("Space").performClick()
            compose.onNode(hasSetTextAction()).assertTextContains(" ")
            compose.onNodeWithText("Leave").performScrollTo().performClick()
            compose.onNodeWithText("Keep typing").assertIsDisplayed()
        }
    }
}
