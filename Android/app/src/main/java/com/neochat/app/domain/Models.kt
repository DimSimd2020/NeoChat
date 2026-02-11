package com.neochat.app.domain

data class User(
    val id: String,
    val username: String,
    val status: String, // "online", "offline", "typing"
    val lastSeen: Long,
    val avatarUrl: String? = null
)

data class Chat(
    val id: String,
    val type: String, // "private", "group"
    val name: String,
    val avatarUrl: String? = null,
    val unreadCount: Int,
    val lastMessage: MessagePreview?,
    val participants: List<String>
)

data class MessagePreview(
    val text: String,
    val timestamp: Long
)

data class Message(
    val id: String,
    val chatId: String,
    val senderId: String,
    val text: String,
    val timestamp: Long,
    val status: String, // "read", "sending", "sent", "delivered", "failed"
    val attachments: List<String> = emptyList()
)
