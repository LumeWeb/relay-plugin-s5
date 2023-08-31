import type { PluginAPI } from "@lumeweb/interface-relay";
import {
  S5NodeConfig,
  createKeyPair,
  createNode,
  NodeId,
} from "@lumeweb/libs5";
import HyperTransportPeer from "@lumeweb/libs5-transport-hyper";
import { Level } from "level";

import { PROTOCOL } from "./constants.js";
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
      const s5peer = new HyperTransportPeer({
        muxer,
        peer,
        protocol: PROTOCOL,
      });

      s5peer.id = new NodeId(peer.remotePublicKey);

      await s5peer.init();
      node.services.p2p.onNewPeer(s5peer, true);
    });
  },
};

export default plugin;
