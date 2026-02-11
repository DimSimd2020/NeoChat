package com.neochat.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.Surface
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.neochat.app.ui.ChatListScreen
import com.neochat.app.ui.ChatScreen
import com.neochat.app.ui.SettingsScreen
import com.neochat.app.ui.theme.NeoChatTheme
import com.neochat.app.ui.theme.NeoBlack

sealed class Screen(val route: String) {
    object ChatList : Screen("chat_list")
    object Chat : Screen("chat/{chatId}") {
        fun createRoute(chatId: String) = "chat/$chatId"
    }
    object Settings : Screen("settings")
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Initialize Rust Core
        com.neochat.app.data.MockRepository.init(applicationContext)

        setContent {
            NeoChatTheme {
                Surface(color = NeoBlack) {
                    val navController = rememberNavController()
                    
                    NavHost(
                        navController = navController,
                        startDestination = Screen.ChatList.route
                    ) {
                        composable(Screen.ChatList.route) {
                            ChatListScreen(
                                onChatClick = { chatId ->
                                    navController.navigate(Screen.Chat.createRoute(chatId))
                                },
                                onSettingsClick = {
                                    navController.navigate(Screen.Settings.route)
                                }
                            )
                        }
                        
                        composable(Screen.Chat.route) { backStackEntry ->
                            val chatId = backStackEntry.arguments?.getString("chatId") ?: return@composable
                            ChatScreen(
                                chatId = chatId,
                                onBackClick = { navController.popBackStack() }
                            )
                        }
                        
                        composable(Screen.Settings.route) {
                            SettingsScreen(
                                onBackClick = { navController.popBackStack() }
                            )
                        }
                    }
                }
            }
        }
    }
}
