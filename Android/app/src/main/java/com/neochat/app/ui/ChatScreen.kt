package com.neochat.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.neochat.app.data.MockRepository
import com.neochat.app.domain.Message
import com.neochat.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    chatId: String,
    onBackClick: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current
    var text by remember { mutableStateOf("") }
    var messages by remember { mutableStateOf(emptyList<Message>()) }
    val listState = rememberLazyListState()

    LaunchedEffect(chatId) {
        MockRepository.getMessages(chatId).collect { list ->
            messages = list
            // Scroll to bottom (which is top in reverse layout)
            if (list.isNotEmpty()) {
                listState.scrollToItem(0)
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Alice", color = NeoOnSurface) // Ideally fetch chat name
                        Text("Online", style = MaterialTheme.typography.bodySmall, color = NeoPrimary)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = NeoOnSurface)
                    }
                },
                actions = {
                    IconButton(onClick = { /* Menu */ }) {
                        Icon(Icons.Default.MoreVert, contentDescription = "Menu", tint = NeoOnSurface)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = NeoSurface)
            )
        },
        bottomBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(NeoSurface)
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextField(
                    value = text,
                    onValueChange = { text = it },
                    placeholder = { Text("Message...") },
                    modifier = Modifier.weight(1f),
                    colors = TextFieldDefaults.colors(
                        focusedContainerColor = NeoBlack,
                        unfocusedContainerColor = NeoBlack,
                        focusedTextColor = NeoOnSurface,
                        unfocusedTextColor = NeoOnSurface,
                        cursorColor = NeoPrimary
                    ),
                    shape = RoundedCornerShape(24.dp),
                    keyboardOptions = KeyboardOptions.Default.copy(
                         imeAction = ImeAction.Send
                    ),
                    keyboardActions = KeyboardActions(
                        onSend = {
                             if (text.isNotBlank()) {
                                 MockRepository.sendMessage(chatId, text)
                                 text = ""
                                 focusManager.clearFocus()
                             }
                        }
                    )
                )
                
                Spacer(modifier = Modifier.width(8.dp))
                
                IconButton(
                    onClick = {
                        if (text.isNotBlank()) {
                            MockRepository.sendMessage(chatId, text)
                            text = ""
                        }
                    },
                    modifier = Modifier
                        .background(if (text.isNotBlank()) NeoPrimary else NeoSurface, CircleShape)
                ) {
                    Icon(
                        Icons.Default.Send, 
                        contentDescription = "Send",
                        tint = if (text.isNotBlank()) Color.White else NeoOnSurfaceVariant
                    )
                }
            }
        },
        containerColor = NeoBlack
    ) { paddingValues ->
        LazyColumn(
            state = listState,
            reverseLayout = true,
            modifier = Modifier
                .padding(paddingValues)
                .fillMaxSize()
                .background(NeoBlack),
            contentPadding = PaddingValues(8.dp)
        ) {
            items(messages.reversed()) { message -> // reverse mock data to show newest at bottom (index 0)
                 MessageItem(message = message, isMe = message.senderId == MockRepository.getMyProfile().id)
                 Spacer(modifier = Modifier.height(4.dp))
            }
        }
    }
}

@Composable
fun MessageItem(message: Message, isMe: Boolean) {
    Box(
        modifier = Modifier.fillMaxWidth(),
        contentAlignment = if (isMe) Alignment.CenterEnd else Alignment.CenterStart
    ) {
        Column(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .background(
                    if (isMe) NeoMyBubble else NeoOtherBubble,
                    shape = RoundedCornerShape(
                        topStart = 16.dp,
                        topEnd = 16.dp,
                        bottomStart = if (isMe) 16.dp else 0.dp,
                        bottomEnd = if (isMe) 0.dp else 16.dp
                    )
                )
                .padding(12.dp)
        ) {
            Text(
                text = message.text, 
                color = NeoOnSurface
            )
            Text(
                text = "12:00", // timestamp format
                style = MaterialTheme.typography.labelSmall,
                color = NeoOnSurfaceVariant,
                modifier = Modifier.align(Alignment.End)
            )
        }
    }
}
