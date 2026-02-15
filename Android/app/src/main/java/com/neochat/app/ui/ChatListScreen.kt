package com.neochat.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neochat.app.data.MockRepository
import com.neochat.app.domain.Chat
import com.neochat.app.ui.theme.NeoBlack
import com.neochat.app.ui.theme.NeoOnSurface
import com.neochat.app.ui.theme.NeoOnSurfaceVariant
import com.neochat.app.ui.theme.NeoPrimary
import com.neochat.app.ui.theme.NeoSurface
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatListScreen(
    onChatClick: (String) -> Unit,
    onSettingsClick: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var chats by remember { mutableStateOf(emptyList<Chat>()) }

    LaunchedEffect(Unit) {
        // Collect from MockRepository flow
        MockRepository.getChats().collect { list ->
            chats = list
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("NeoChat", color = NeoOnSurface) },
                actions = {
                    IconButton(onClick = { /* Search */ }) {
                        Icon(Icons.Default.Search, contentDescription = "Search", tint = NeoOnSurface)
                    }
                    IconButton(onClick = onSettingsClick) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu", tint = NeoOnSurface)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = NeoBlack)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { /* New Chat */ },
                containerColor = NeoPrimary,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "New Chat")
            }
        },
        containerColor = NeoBlack
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .padding(paddingValues)
                .fillMaxSize()
                .background(NeoBlack)
        ) {
            items(chats) { chat ->
                ChatListItem(chat = chat, onClick = { onChatClick(chat.id) })
                Divider(color = NeoSurface, thickness = 1.dp)
            }
        }
    }
}

@Composable
fun ChatListItem(chat: Chat, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Avatar Placeholder
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(NeoSurface),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = chat.name.take(1).uppercase(),
                color = NeoPrimary,
                fontWeight = FontWeight.Bold,
                fontSize = 20.sp
            )
        }
        
        Spacer(modifier = Modifier.width(16.dp))
        
        Column(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = chat.name,
                    color = NeoOnSurface,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                
                chat.lastMessage?.let { msg ->
                    Text(
                        text = "12:00", // Would format timestamp here
                        color = NeoOnSurfaceVariant,
                        fontSize = 12.sp
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = chat.lastMessage?.text ?: "No messages yet",
                    color = NeoOnSurfaceVariant,
                    fontSize = 14.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                
                if (chat.unreadCount > 0) {
                    Box(
                        modifier = Modifier
                            .background(NeoPrimary, CircleShape)
                            .padding(horizontal = 8.dp, vertical = 2.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = chat.unreadCount.toString(),
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}
