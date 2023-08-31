import type { PluginAPI } from "@lumeweb/interface-relay";
import { createKeyPair, createNode, S5NodeConfig } from "@lumeweb/libs5";
import { Level } from "level";
import { PROTOCOL } from "./constants.js";
import HyperTransportPeer from "./hyperTransport.js";
import { NodeId } from "@lumeweb/libs5";
import * as fs from "fs/promises";

const plugin = {
  name: "s5",
  async plugin(api: PluginAPI) {
    const dbPath = api.pluginConfig.str("db") as string;

    try {
      await fs.access(dbPath);
    } catch {
      await fs.mkdir(dbPath, { recursive: true });
    }

    const db = new Level<string, Uint8Array>(dbPath);
    await db.open();
    let config = {
      keyPair: createKeyPair(api.identity.publicKeyRaw),
      db,
      p2p: {
        peers: {
          initial: api.pluginConfig.array("p2p.peers.initial") ?? [],
        },
      },
    } as S5NodeConfig;

    const node = createNode(config);

    await node.start();

    api.swarm.join(api.util.crypto.createHash(PROTOCOL));
    api.protocols.register(PROTOCOL, async (peer: any, muxer: any) => {
      const s5peer = new HyperTransportPeer(peer, [], muxer);

      s5peer.id = new NodeId(peer.remotePublicKey);

      await s5peer.init();
      node.services.p2p.onNewPeer(s5peer, true);
    });
  },
};

export default plugin;
