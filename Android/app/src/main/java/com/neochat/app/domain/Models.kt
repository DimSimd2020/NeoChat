package com.neochat.app.domain

data class User(
    val id: String,
    val username: String,
    val status: String, // "online", "offline", "typing"
    val lastSeen: Long,
    val avatarUrl: String? = null
)

data class Contact(
    val id: String,
    val name: String,
    val avatarUrl: String? = null,
    val status: String,
    val phoneNumber: String? = null // For SMS fallback mode
)

enum class TransportMode(val label: String, val icon: String) {
    INTERNET("P2P Internet", "🌐"),
    CDN_RELAY("CDN Relay", "☁️"),
    DNS_TUNNEL("DNS Tunnel", "📡"),
    MESH("Mesh", "🕸️"),
    SMS("SMS", "📱");

    companion object {
        fun fromString(s: String): TransportMode = when(s.lowercase()) {
            "internet" -> INTERNET
            "cdnrelay", "cdn_relay" -> CDN_RELAY
            "dnstunnel", "dns_tunnel" -> DNS_TUNNEL
            "mesh" -> MESH
            "sms" -> SMS
            else -> INTERNET
        }
    }
}

data class Chat(
    val id: String,
    val type: String, // "private", "group"
    val name: String,
    val avatarUrl: String? = null,
    val unreadCount: Int,
    val lastMessage: MessagePreview?,
    val participants: List<String>,
    val transport: TransportMode = TransportMode.INTERNET
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
    val attachments: List<String> = emptyList(),
    val transport: TransportMode = TransportMode.INTERNET
)
