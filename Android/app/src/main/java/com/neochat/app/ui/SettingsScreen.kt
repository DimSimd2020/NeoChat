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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neochat.app.R
import com.neochat.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBackClick: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.nav_settings), color = NeoOnSurface) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.common_back), tint = NeoOnSurface)
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
            SettingsCategory(stringResource(R.string.settings_account))
            SettingsItem(Icons.Default.AccountCircle, stringResource(R.string.settings_profile), stringResource(R.string.settings_profile_desc))
            SettingsItem(Icons.Default.Lock, stringResource(R.string.settings_privacy), stringResource(R.string.settings_privacy_desc))

            HorizontalDivider(color = NeoSurface, thickness = 1.dp, modifier = Modifier.padding(vertical = 16.dp))

            SettingsCategory(stringResource(R.string.transport_title))
            SettingsItem(Icons.Default.Settings, stringResource(R.string.transport_default), stringResource(R.string.transport_default_desc))
            SettingsItem(Icons.Default.Settings, stringResource(R.string.transport_cdn_relay), stringResource(R.string.transport_relay_url))
            SettingsItem(Icons.Default.Settings, stringResource(R.string.transport_mesh), stringResource(R.string.transport_mesh_settings))
            SettingsItem(Icons.Default.Settings, stringResource(R.string.transport_sms), stringResource(R.string.transport_sms_config))

            HorizontalDivider(color = NeoSurface, thickness = 1.dp, modifier = Modifier.padding(vertical = 16.dp))

            SettingsCategory(stringResource(R.string.settings_appearance))
            SettingsItem(Icons.Default.Settings, stringResource(R.string.settings_theme), stringResource(R.string.settings_theme_desc))
            SettingsItem(Icons.Default.Settings, stringResource(R.string.settings_accent), stringResource(R.string.settings_accent_desc))

            HorizontalDivider(color = NeoSurface, thickness = 1.dp, modifier = Modifier.padding(vertical = 16.dp))

            SettingsCategory(stringResource(R.string.settings_about))
            SettingsItem(Icons.Default.Settings, stringResource(R.string.settings_version), "1.0.0 Alpha")
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
