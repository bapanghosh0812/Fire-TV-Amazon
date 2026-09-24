package expo.modules.firetvvoice

import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Handler
import android.os.Looper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class SessionState : Record {
  @Field var title: String = ""
  @Field var subtitle: String = ""
  @Field var playing: Boolean = false
  @Field var positionMs: Double = 0.0
  @Field var durationMs: Double = 0.0
  @Field var canNext: Boolean = true
  @Field var canPrevious: Boolean = true
}

/**
 * Exposes an Android MediaSession so Fire TV's Alexa voice commands
 * ("Alexa, pause", "Alexa, next", "Alexa, restart") reach the React app.
 */
class FireTvVoiceModule : Module() {
  private var session: MediaSession? = null
  private val main = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("FireTvVoice")
    Events("onCommand")

    Function("activate") { state: SessionState ->
      main.post {
        ensureSession()
        apply(state)
        session?.isActive = true
      }
    }

    Function("update") { state: SessionState ->
      main.post { apply(state) }
    }

    Function("deactivate") {
      main.post { release() }
    }

    OnDestroy { main.post { release() } }
  }

  private fun ensureSession() {
    if (session != null) return
    val context = appContext.reactContext ?: return
    session = MediaSession(context, "Storyloom").apply {
      setCallback(object : MediaSession.Callback() {
        override fun onPlay() = emit("play")
        override fun onPause() = emit("pause")
        override fun onStop() = emit("pause")
        override fun onSkipToNext() = emit("next")
        override fun onSkipToPrevious() = emit("previous")
        override fun onFastForward() = emit("next")
        override fun onRewind() = emit("previous")
        override fun onSeekTo(pos: Long) = emit("seekTo", pos)
      })
    }
  }

  private fun emit(command: String, positionMs: Long = -1L) {
    sendEvent("onCommand", mapOf("command" to command, "positionMs" to positionMs.toDouble()))
  }

  private fun apply(state: SessionState) {
    val s = session ?: return
    var actions = PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or
      PlaybackState.ACTION_PLAY_PAUSE or PlaybackState.ACTION_STOP or PlaybackState.ACTION_SEEK_TO
    if (state.canNext) actions = actions or PlaybackState.ACTION_SKIP_TO_NEXT or PlaybackState.ACTION_FAST_FORWARD
    if (state.canPrevious) actions = actions or PlaybackState.ACTION_SKIP_TO_PREVIOUS or PlaybackState.ACTION_REWIND

    s.setPlaybackState(
      PlaybackState.Builder()
        .setActions(actions)
        .setState(
          if (state.playing) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED,
          state.positionMs.toLong(),
          if (state.playing) 1f else 0f
        )
        .build()
    )
    s.setMetadata(
      MediaMetadata.Builder()
        .putString(MediaMetadata.METADATA_KEY_TITLE, state.title)
        .putString(MediaMetadata.METADATA_KEY_ARTIST, state.subtitle)
        .putLong(MediaMetadata.METADATA_KEY_DURATION, state.durationMs.toLong())
        .build()
    )
  }

  private fun release() {
    session?.isActive = false
    session?.release()
    session = null
  }
}
