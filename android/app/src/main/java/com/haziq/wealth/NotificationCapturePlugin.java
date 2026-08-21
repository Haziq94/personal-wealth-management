package com.haziq.wealth;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Bridges {@link WealthNotificationListener} to the web layer. */
@CapacitorPlugin(name = "NotificationCapture")
public class NotificationCapturePlugin extends Plugin {
    private static NotificationCapturePlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
        super.handleOnDestroy();
    }

    /**
     * Called from the listener service. Silently does nothing when the web
     * layer isn't loaded — the caller has already queued the item, which is
     * what gets read on next launch.
     */
    static void deliver(JSONObject item) {
        NotificationCapturePlugin plugin = instance;
        if (plugin == null) return;
        try {
            plugin.notifyListeners("notification", JSObject.fromJSONObject(item));
        } catch (JSONException ignored) {
            // Malformed payload; the queued copy is still there to fall back on.
        }
    }

    /**
     * Notification access can only be granted by the user in system settings —
     * there's no runtime prompt for it — so this is a plain read of current state.
     */
    @PluginMethod
    public void isPermissionGranted(PluginCall call) {
        String enabled = Settings.Secure.getString(
            getContext().getContentResolver(),
            "enabled_notification_listeners"
        );
        boolean granted = enabled != null && enabled.contains(getContext().getPackageName());
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    /** The app's own on/off switch, independent of the system permission. */
    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        SharedPreferences prefs = prefs();
        SharedPreferences.Editor editor = prefs.edit().putBoolean(WealthNotificationListener.KEY_ENABLED, enabled);
        // Switching capture off shouldn't leave already-captured text sitting on disk.
        if (!enabled) editor.remove(WealthNotificationListener.KEY_QUEUE);
        editor.apply();
        call.resolve();
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", prefs().getBoolean(WealthNotificationListener.KEY_ENABLED, false));
        call.resolve(result);
    }

    /** Returns everything captured since the last call, and clears the queue. */
    @PluginMethod
    public void takePending(PluginCall call) {
        SharedPreferences prefs = prefs();
        String raw = prefs.getString(WealthNotificationListener.KEY_QUEUE, "[]");
        prefs.edit().remove(WealthNotificationListener.KEY_QUEUE).apply();

        JSONArray queued;
        try {
            queued = new JSONArray(raw);
        } catch (JSONException e) {
            queued = new JSONArray();
        }
        JSObject response = new JSObject();
        response.put("notifications", queued);
        call.resolve(response);
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(WealthNotificationListener.PREFS, Context.MODE_PRIVATE);
    }
}
