import { Logger, Peer, PeerStatic } from "@lumeweb/libs5";
import { URL } from "url";
import NodeId from "@lumeweb/libs5/lib/nodeId.js";
import { Buffer } from "buffer";
import { PROTOCOL } from "./constants.js";
import { Readable } from "streamx";

export default class HyperTransportPeer implements Peer {
  challenge: Uint8Array;
  connectionUris: Array<URL>;
  isConnected: boolean = false;
  private _peer: any;
  private _muxer: any;
  private _socket = new Readable();
  private _pipe?: any;

  constructor(peer: any, connectionUris: URL[], muxer: any) {
    this.connectionUris = connectionUris.map((uri) => new URL(uri.toString()));
    this.challenge = new Uint8Array();
    this._peer = peer;
    this._muxer = muxer;
  }

  private _id?: NodeId;

  get id(): NodeId {
    return this._id as NodeId;
  }

  set id(value: NodeId) {
    this._id = value;
  }

  public async init() {
    const channel = await this._muxer.createChannel({
      protocol: PROTOCOL,
    });

    const self = this;

    this._pipe = await channel.addMessage({
      async onmessage(m) {
        if (m instanceof Uint8Array) {
          m = Buffer.from(m);
        }

        self._socket.push(m);
      },
    });

    await channel.open();
  }

  public static async connect(uri: URL): Promise<any> {
    return Promise.reject("not supported");
  }

  listenForMessages(
    callback: (event: any) => Promise<void>,
    {
      onDone,
      onError,
      logger,
    }: {
      onDone?: any;
      onError?: (...args: any[]) => void;
      logger: Logger;
    },
  ): void {
    this._socket.on("data", async (data: Buffer) => {
      await callback(data);
    });

    if (onDone) {
      this._socket.on("end", onDone);
    }

    if (onError) {
      this._socket.on("error", onError);
    }
  }

  renderLocationUri(): string {
    return "Hypercore client";
  }

  sendMessage(message: Uint8Array): void {
    this._pipe.write(message);
  }
}
