import * as Y from "yjs";
import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

export class SupabaseYjsProvider {
  private channel: RealtimeChannel;
  private ydoc: Y.Doc;
  private isDestroyed = false;

  constructor(
    supabase: SupabaseClient,
    channelName: string,
    ydoc: Y.Doc
  ) {
    this.ydoc = ydoc;

    // Join Supabase Realtime Broadcast channel
    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false },
      },
    });

    // Listen to incoming collaborative document updates
    this.channel
      .on("broadcast", { event: "yjs-update" }, ({ payload }) => {
        if (this.isDestroyed) return;
        if (payload?.update) {
          const update = new Uint8Array(payload.update);
          // Apply CRDT update locally
          Y.applyUpdate(this.ydoc, update, this);
        }
      })
      .subscribe();

    // Listen to local document mutations and broadcast them to peer clients
    this.ydoc.on("update", (update, origin) => {
      if (origin === this) return; // Ignore updates that came from the network
      if (this.isDestroyed) return;

      this.channel.send({
        type: "broadcast",
        event: "yjs-update",
        payload: {
          update: Array.from(update),
        },
      });
    });
  }

  destroy() {
    this.isDestroyed = true;
    this.channel.unsubscribe();
  }
}
