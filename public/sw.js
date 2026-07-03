/**
 * VAULTX Push Service Worker
 *
 * Scope: site root ("/"), so it can receive push events regardless of
 * which dashboard route the user was last on. Registered by
 * components/notifications/push-toggle.tsx on user opt-in — this file
 * does nothing on its own until a subscription exists.
 */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "VAULTX", body: event.data.text() };
  }

  const { title, body, link, tag } = payload;

  event.waitUntil(
    self.registration.showNotification(title || "VAULTX", {
      body: body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: tag || undefined,
      data: { link: link || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.link || "/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing VAULTX tab if one is open, navigating it
        // to the notification's target instead of opening a duplicate.
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
