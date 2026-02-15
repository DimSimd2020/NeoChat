import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.11.0")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.25")
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
    
    // Disable strict warning checks and incremental compilation (to fix different roots error)
    tasks.withType<KotlinCompile>().configureEach {
        kotlinOptions {
            allWarningsAsErrors = false
        }
        incremental = false
    }

    // Fix for "npm" not found in Android Studio environment
    tasks.configureEach {
        if (this is Exec) {
            val nodeDir = "C:\\Program Files\\nodejs"
            val currentPath = environment["PATH"]?.toString() ?: ""
            if (!currentPath.contains(nodeDir, ignoreCase = true)) {
                environment("PATH", "$nodeDir;$currentPath")
            }
        }
    }
}

tasks.register("clean").configure {
    delete("build")
}

