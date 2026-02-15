package com.neochat.app.data

import android.content.Context
import com.neochat.app.domain.Chat
import com.neochat.app.domain.Message
import com.neochat.app.domain.MessagePreview
import com.neochat.app.domain.TransportMode
import com.neochat.app.domain.User
import com.neochat.core.NeoChatCore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

object MockRepository {

    private var core: NeoChatCore? = null

    fun init(context: Context) {
        if (core == null) {
            val dbPath = context.filesDir.absolutePath + "/neochat.db"
            core = NeoChatCore(dbPath)
        }
    }

    private fun getCoreOrThrow(): NeoChatCore {
        return core ?: throw IllegalStateException("NeoChatCore not initialized! Call MockRepository.init(context) first.")
    }

    fun getMyProfile(): User {
        return try {
            getCoreOrThrow().getMyProfile().toDomain()
        } catch (e: Exception) {
            User("error", "Error: ${e.message}", "offline", 0)
        }
    }

    fun getChats(): Flow<List<Chat>> = flow {
        try {
            val list = getCoreOrThrow().getChats()
            emit(list.map { it.toDomain() })
        } catch (e: Exception) {
            emit(emptyList())
        }
    }

    fun getMessages(chatId: String): Flow<List<Message>> = flow {
        try {
            val list = getCoreOrThrow().getMessages(chatId, 50u, 0u)
            emit(list.map { it.toDomain() })
        } catch (e: Exception) {
            emit(emptyList())
        }
    }

    fun sendMessage(chatId: String, text: String): Message {
        val msg = getCoreOrThrow().sendMessage(chatId, text)
        return msg.toDomain()
    }

    fun getChatById(chatId: String): Chat? {
        return try {
            getCoreOrThrow().getChats().find { it.id == chatId }?.toDomain()
        } catch (e: Exception) {
            null
        }
    }
}

// Extension functions to map Core types to Domain types

private fun com.neochat.core.User.toDomain(): User {
    return User(
        id = this.id,
        username = this.username,
        status = this.status.name.lowercase(),
        lastSeen = this.lastSeen.toLong() * 1000,
        avatarUrl = this.avatarUrl
    )
}

private fun com.neochat.core.Chat.toDomain(): Chat {
    val lastMsgPreview = this.lastMessage?.let {
        MessagePreview(it.text, it.timestamp.toLong() * 1000)
    }
    return Chat(
        id = this.id,
        type = this.chatType.name.lowercase(),
        name = this.name,
        avatarUrl = this.avatarUrl,
        unreadCount = this.unreadCount.toInt(),
        lastMessage = lastMsgPreview,
        participants = this.participants,
        transport = TransportMode.fromString(this.transport.name)
    )
}

private fun com.neochat.core.Message.toDomain(): Message {
    return Message(
        id = this.id,
        chatId = this.chatId,
        senderId = this.senderId,
        text = this.text,
        timestamp = this.timestamp.toLong() * 1000,
        status = this.status.name.lowercase(),
        attachments = this.attachments,
        transport = TransportMode.fromString(this.transport.name)
    )
}
