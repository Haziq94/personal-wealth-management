package com.haziq.wealth;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.text.TextUtils;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.regex.Pattern;

/**
 * Watches notifications for bank and e-wallet spending alerts.
 *
 * The permission behind this service exposes every notification on the device,
 * so the guiding rule here is to keep as little as possible: a notification is
 * tested against a coarse "mentions money" gate in memory, and anything that
 * fails is dropped on the spot, never queued and never written to disk. What
 * survives is parsed properly in JS (src/lib/notificationParser.js) and still
 * only becomes a suggestion the user has to confirm.
 */
public class WealthNotificationListener extends NotificationListenerService {
    static final String PREFS = "wealth_notification_capture";
    static final String KEY_QUEUE = "queue";
    static final String KEY_ENABLED = "enabled";

    /** Bounded so a burst of alerts while the app is closed can't grow without limit. */
    private static final int MAX_QUEUED = 100;

    /**
     * Deliberately loose — it only has to be cheap and to let real alerts
     * through. Precision is the JS parser's job; this is the filter that keeps
     * chats, mail and news from ever being stored.
     */
    private static final Pattern MENTIONS_MONEY = Pattern.compile(
        "(RM|MYR|SGD|S\\$|USD|AUD|A\\$|EUR|GBP|IDR|THB|JPY|CNY|INR|Rp|[$€£¥₹฿])\\s*\\d",
        Pattern.CASE_INSENSITIVE
    );

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || getPackageName().equals(sbn.getPackageName())) return;

        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        // Capture stays off until switched on in the app, so granting the
        // permission alone is never enough to start collecting anything.
        if (!prefs.getBoolean(KEY_ENABLED, false)) return;

        Notification notification = sbn.getNotification();
        if (notification == null) return;
        Bundle extras = notification.extras;
        if (extras == null) return;

        String title = text(extras.getCharSequence(Notification.EXTRA_TITLE));
        String body = text(extras.getCharSequence(Notification.EXTRA_TEXT));
        if (TextUtils.isEmpty(body)) {
            body = text(extras.getCharSequence(Notification.EXTRA_BIG_TEXT));
        }
        if (TextUtils.isEmpty(title) && TextUtils.isEmpty(body)) return;
        if (!MENTIONS_MONEY.matcher(title + " " + body).find()) return;

        try {
            JSONObject item = new JSONObject();
            item.put("title", title);
            item.put("text", body);
            item.put("postTime", sbn.getPostTime());
            enqueue(prefs, item);
            // Straight to the web layer when the app happens to be running;
            // otherwise the queue above is what it reads on next launch.
            NotificationCapturePlugin.deliver(item);
        } catch (JSONException ignored) {
            // A notification we can't even represent as JSON isn't worth retrying.
        }
    }

    private static String text(CharSequence value) {
        return value == null ? "" : value.toString();
    }

    private void enqueue(SharedPreferences prefs, JSONObject item) {
        JSONArray queue;
        try {
            queue = new JSONArray(prefs.getString(KEY_QUEUE, "[]"));
        } catch (JSONException e) {
            queue = new JSONArray();
        }
        queue.put(item);

        // Keep only the newest MAX_QUEUED once the cap is passed.
        if (queue.length() > MAX_QUEUED) {
            JSONArray trimmed = new JSONArray();
            for (int i = queue.length() - MAX_QUEUED; i < queue.length(); i++) {
                trimmed.put(queue.opt(i));
            }
            queue = trimmed;
        }
        prefs.edit().putString(KEY_QUEUE, queue.toString()).apply();
    }
}
