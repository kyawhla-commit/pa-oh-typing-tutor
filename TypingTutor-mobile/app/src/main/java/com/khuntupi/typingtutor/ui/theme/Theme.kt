package com.khuntupi.typingtutor.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = androidx.compose.ui.graphics.Color(0xFF79D8B0),
    secondary = androidx.compose.ui.graphics.Color(0xFF79D8B0),
    secondaryContainer = androidx.compose.ui.graphics.Color(0xFF254C3B),
    onSecondaryContainer = androidx.compose.ui.graphics.Color(0xFFB7F4D7),
    surfaceContainer = androidx.compose.ui.graphics.Color(0xFF17291F),
    primaryContainer = androidx.compose.ui.graphics.Color(0xFF173E30),
    onPrimaryContainer = androidx.compose.ui.graphics.Color(0xFFB7F4D7),
    background = androidx.compose.ui.graphics.Color(0xFF101C18),
    surface = androidx.compose.ui.graphics.Color(0xFF101C18),
    surfaceVariant = androidx.compose.ui.graphics.Color(0xFF20352C),
)

private val LightColorScheme = lightColorScheme(
    primary = androidx.compose.ui.graphics.Color(0xFF146B4B),
    secondary = androidx.compose.ui.graphics.Color(0xFF146B4B),
    secondaryContainer = androidx.compose.ui.graphics.Color(0xFFD9F0DF),
    onSecondaryContainer = androidx.compose.ui.graphics.Color(0xFF143B29),
    surfaceContainer = androidx.compose.ui.graphics.Color(0xFFF0F4EB),
    primaryContainer = androidx.compose.ui.graphics.Color(0xFFD9F0DF),
    onPrimaryContainer = androidx.compose.ui.graphics.Color(0xFF143B29),
    background = androidx.compose.ui.graphics.Color(0xFFF7F9F2),
    surface = androidx.compose.ui.graphics.Color(0xFFF7F9F2),
    surfaceVariant = androidx.compose.ui.graphics.Color(0xFFEAF0E5),

)

@Composable
fun TypingTutorTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    // Dynamic color is available on Android 12+
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
