package com.neochat.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = NeoPrimary,
    onPrimary = Color.Black, // Or White
    background = NeoBlack,
    onBackground = NeoOnSurface,
    surface = NeoSurface,
    onSurface = NeoOnSurface,
    secondary = NeoNeon,
    onSecondary = Color.Black,
    error = NeoError,
)

// No light theme as per doc: "солько тёмная пока" or primarily dark
private val LightColorScheme = DarkColorScheme // Force dark for now if requested as only dark theme

@Composable
fun NeoChatTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        // typography = Typography, // Default Material 3 typography
        content = content
    )
}
