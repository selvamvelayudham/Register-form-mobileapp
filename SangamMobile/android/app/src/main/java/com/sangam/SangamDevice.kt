package tech.shreeswayam.sangam

import android.app.Activity
import android.content.Intent
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.ReactPackage
import java.net.HttpURLConnection
import java.net.URL
import java.security.KeyStore
import java.util.concurrent.Executors
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Android document picker and encrypted admin session. No storage permissions required. */
class SangamDevice(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context), ActivityEventListener {
  private val executor = Executors.newSingleThreadExecutor()
  private var pending: Promise? = null
  private var downloadUrl = ""
  private var downloadHeaders = emptyMap<String, String>()
  init { context.addActivityEventListener(this) }
  override fun getName() = "SangamDevice"
  private fun key(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (store.getKey("sangam.session", null) as? SecretKey)?.let { return it }
    return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
      init(KeyGenParameterSpec.Builder("sangam.session", KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
    }.generateKey()
  }
  @ReactMethod fun saveSession(value: String, promise: Promise) {
    try {
      val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
      val data = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
      val encoded = Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" + Base64.encodeToString(data, Base64.NO_WRAP)
      if (!context.getSharedPreferences("sangam", 0).edit().putString("session", encoded).commit()) throw Exception("Could not save session")
      promise.resolve(null)
    } catch (e: Exception) { promise.reject("SESSION", "Could not securely save session", e) }
  }
  @ReactMethod fun readSession(promise: Promise) {
    try {
      val saved = context.getSharedPreferences("sangam", 0).getString("session", null)
      if (saved == null) { promise.resolve(null); return }
      val parts = saved.split(":")
      val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP))) }
      promise.resolve(String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8))
    } catch (e: Exception) { context.getSharedPreferences("sangam", 0).edit().remove("session").apply(); promise.resolve(null) }
  }
  @ReactMethod fun clearSession(promise: Promise) { context.getSharedPreferences("sangam", 0).edit().remove("session").apply(); promise.resolve(null) }
  @ReactMethod fun saveDownload(url: String, filename: String, headers: ReadableMap, promise: Promise) {
    val uri = android.net.Uri.parse(url)
    if (uri.scheme != "https" || uri.host != "shreeswayam.tech" || !(uri.path ?: "").startsWith("/api/")) { promise.reject("URL", "Invalid download address"); return }
    val activity = context.currentActivity ?: run { promise.reject("ACTIVITY", "Open the app before saving a file"); return }
    if (pending != null) { promise.reject("BUSY", "Another file is being saved"); return }
    pending = promise; downloadUrl = url
    downloadHeaders = headers.toHashMap().mapValues { it.value.toString() }
    try { activity.startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE); type = if (filename.endsWith(".csv")) "text/csv" else "application/pdf"; putExtra(Intent.EXTRA_TITLE, filename)
    }, 4019) } catch (e: Exception) { pending = null; downloadHeaders = emptyMap(); promise.reject("SAVE", "Could not open the file picker", e) }
  }
  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != 4019) return
    val promise = pending ?: return
    val uri = data?.data
    if (resultCode != Activity.RESULT_OK || uri == null) { pending = null; downloadHeaders = emptyMap(); promise.resolve(false); return }
    val url = downloadUrl; val headers = downloadHeaders
    executor.execute {
      var connection: HttpURLConnection? = null
      try {
        connection = URL(url).openConnection() as HttpURLConnection
        connection.connectTimeout = 30000; connection.readTimeout = 60000; connection.instanceFollowRedirects = false
        headers.forEach { (k,v) -> connection.setRequestProperty(k,v) }
        if (connection.responseCode !in 200..299) throw Exception("Download failed (${connection.responseCode}). The receipt or session may have expired.")
        context.contentResolver.openOutputStream(uri)?.use { output -> connection.inputStream.use { input -> input.copyTo(output) } } ?: throw Exception("Could not open the selected file")
        promise.resolve(true)
      } catch (e: Exception) { promise.reject("DOWNLOAD", e.message, e) }
      finally { connection?.disconnect(); pending = null; downloadHeaders = emptyMap(); downloadUrl = "" }
    }
  }
  override fun onNewIntent(intent: Intent) {}
}
class SangamPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(SangamDevice(context))
  override fun createViewManagers(context: ReactApplicationContext): List<com.facebook.react.uimanager.ViewManager<*, *>> = emptyList()
}
