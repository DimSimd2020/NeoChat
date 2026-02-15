package com.neochat.app.ui

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neochat.app.R
import com.neochat.app.data.MockRepository
import com.neochat.app.domain.Chat
import com.neochat.app.domain.Message
import com.neochat.app.domain.TransportMode
import com.neochat.app.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

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
    var chat by remember { mutableStateOf<Chat?>(null) }
    var showTransportMenu by remember { mutableStateOf(false) }
    val listState = rememberLazyListState()
    val timeFormat = remember { SimpleDateFormat("HH:mm", Locale.getDefault()) }

    LaunchedEffect(chatId) {
        chat = MockRepository.getChatById(chatId)
        MockRepository.getMessages(chatId).collect { list ->
            messages = list
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
                        Text(
                            text = chat?.name ?: "",
                            color = NeoOnSurface,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = stringResource(R.string.common_online),
                            style = MaterialTheme.typography.bodySmall,
                            color = NeoPrimary
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.common_back), tint = NeoOnSurface)
                    }
                },
                actions = {
                    // Transport indicator pill
                    val currentTransport = chat?.transport ?: TransportMode.INTERNET
                    Box {
                        Surface(
                            onClick = { showTransportMenu = !showTransportMenu },
                            shape = RoundedCornerShape(16.dp),
                            color = Color(0xFF1E293B),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Text(currentTransport.icon, fontSize = 14.sp)
                                Text(
                                    text = when(currentTransport) {
                                        TransportMode.INTERNET -> stringResource(R.string.transport_internet)
                                        TransportMode.CDN_RELAY -> stringResource(R.string.transport_cdn_relay)
                                        TransportMode.DNS_TUNNEL -> stringResource(R.string.transport_dns_tunnel)
                                        TransportMode.MESH -> stringResource(R.string.transport_mesh)
                                        TransportMode.SMS -> stringResource(R.string.transport_sms)
                                    }.substringAfter(" "), // Remove emoji from label if redundant
                                    color = NeoOnSurfaceVariant,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }

                        DropdownMenu(
                            expanded = showTransportMenu,
                            onDismissRequest = { showTransportMenu = false },
                            modifier = Modifier
                                .background(Color(0xFF1E202A))
                                .widthIn(min = 180.dp)
                        ) {
                            TransportMode.entries.forEach { mode ->
                                DropdownMenuItem(
                                    text = {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Text(mode.icon, fontSize = 16.sp)
                                            Text(
                                                text = when(mode) {
                                                    TransportMode.INTERNET -> stringResource(R.string.transport_internet)
                                                    TransportMode.CDN_RELAY -> stringResource(R.string.transport_cdn_relay)
                                                    TransportMode.DNS_TUNNEL -> stringResource(R.string.transport_dns_tunnel)
                                                    TransportMode.MESH -> stringResource(R.string.transport_mesh)
                                                    TransportMode.SMS -> stringResource(R.string.transport_sms)
                                                }.substringAfter(" "),
                                                color = if (mode == currentTransport) Color(0xFF7C8AFF) else NeoOnSurface,
                                                fontWeight = if (mode == currentTransport) FontWeight.Bold else FontWeight.Normal
                                            )
                                        }
                                    },
                                    onClick = {
                                        chat = chat?.copy(transport = mode)
                                        showTransportMenu = false
                                    },
                                    modifier = Modifier.background(
                                        if (mode == currentTransport) Color(0x255865F2) else Color.Transparent
                                    )
                                )
                            }
                        }
                    }

                    IconButton(onClick = { /* Menu */ }) {
                        Icon(Icons.Default.MoreVert, contentDescription = stringResource(R.string.common_menu), tint = NeoOnSurface)
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
                    placeholder = { Text(stringResource(R.string.common_message_placeholder)) },
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
                                 scope.launch {
                                     MockRepository.sendMessage(chatId, text)
                                     text = ""
                                     focusManager.clearFocus()
                                 }
                             }
                        }
                    )
                )

                Spacer(modifier = Modifier.width(8.dp))

                IconButton(
                    onClick = {
                        if (text.isNotBlank()) {
                            scope.launch {
                                MockRepository.sendMessage(chatId, text)
                                text = ""
                            }
                        }
                    },
                    modifier = Modifier
                        .background(if (text.isNotBlank()) NeoPrimary else NeoSurface, CircleShape)
                ) {
                    Icon(
                        Icons.Default.Send,
                        contentDescription = stringResource(R.string.common_send),
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
            items(messages.reversed()) { message ->
                 MessageItem(
                     message = message,
                     isMe = message.senderId == MockRepository.getMyProfile().id,
                     timeFormat = timeFormat
                 )
                 Spacer(modifier = Modifier.height(4.dp))
            }
        }
    }
}

@Composable
fun MessageItem(message: Message, isMe: Boolean, timeFormat: SimpleDateFormat) {
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
            Row(
                modifier = Modifier.align(Alignment.End),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Transport icon (small)
                if (message.transport != TransportMode.INTERNET) {
                    Text(
                        text = message.transport.icon,
                        fontSize = 10.sp
                    )
                }
                Text(
                    text = timeFormat.format(Date(message.timestamp)),
                    style = MaterialTheme.typography.labelSmall,
                    color = NeoOnSurfaceVariant
                )
                if (isMe) {
                    Text(
                        text = when (message.status) {
                            "read" -> "✓✓"
                            "delivered" -> "✓"
                            "sent" -> "•"
                            else -> "○"
                        },
                        fontSize = 10.sp,
                        color = if (message.status == "read") NeoPrimary else NeoOnSurfaceVariant
                    )
                }
            }
        }
    }
}
