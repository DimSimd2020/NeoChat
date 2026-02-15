package com.neochat.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neochat.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBackClick: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", color = NeoOnSurface) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = NeoOnSurface)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = NeoBlack)
            )
        },
        containerColor = NeoBlack
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .padding(paddingValues)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .background(NeoBlack)
        ) {
            SettingsCategory("Account")
            SettingsItem(Icons.Default.AccountCircle, "My Profile", "Manage your profile & keys")
            SettingsItem(Icons.Default.Lock, "Privacy & Security", "End-to-end encryption settings")
            
            Divider(color = NeoSurface, thickness = 1.dp, modifier = Modifier.padding(vertical = 16.dp))
            
            SettingsCategory("Appearance")
            SettingsItem(Icons.Default.Settings, "Theme", "Dark Mode (Default)")
            SettingsItem(Icons.Default.Settings, "Accent Color", "Neo Blue")
            
            Divider(color = NeoSurface, thickness = 1.dp, modifier = Modifier.padding(vertical = 16.dp))

            SettingsCategory("About")
            SettingsItem(Icons.Default.Settings, "Version", "1.0.0 Alpha")
        }
    }
}

@Composable
fun SettingsCategory(title: String) {
    Text(
        text = title,
        color = NeoPrimary,
        style = MaterialTheme.typography.titleMedium,
        modifier = Modifier.padding(16.dp)
    )
}

@Composable
fun SettingsItem(icon: ImageVector, title: String, subtitle: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = {})
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = NeoOnSurfaceVariant, modifier = Modifier.size(24.dp))
        Spacer(modifier = Modifier.width(16.dp))
        Column {
            Text(text = title, color = NeoOnSurface, fontSize = 16.sp)
            Text(text = subtitle, color = NeoOnSurfaceVariant, fontSize = 14.sp)
        }
    }
}

fun Modifier.clickable(onClick: () -> Unit) = this.then(
    Modifier.clickable(onClick = onClick)
)
