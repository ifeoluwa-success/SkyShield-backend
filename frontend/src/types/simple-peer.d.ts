// src/types/simple-peer.d.ts
declare module 'simple-peer' {
  import { EventEmitter } from 'events';

  namespace SimplePeer {
    interface Options {
      initiator?: boolean;
      channelConfig?: object;
      channelName?: string;
      config?: RTCConfiguration;
      offerConstraints?: object;
      answerConstraints?: object;
      reconnectTimer?: boolean | number;
      sdpTransform?: (sdp: string) => string;
      stream?: MediaStream;
      streams?: MediaStream[];
      trickle?: boolean;
      iceCompleteTimeout?: number;
      allowHalfTrickle?: boolean;
    }

    interface SignalData {
      type?: string;
      sdp?: string;
      candidate?: RTCIceCandidateInit;
      [key: string]: unknown;
    }

    /** Convenience alias so you can type refs as `SimplePeer.Instance` */
    type Instance = SimplePeer;
  }

  class SimplePeer extends EventEmitter {
    constructor(opts?: SimplePeer.Options);
    signal(data: SimplePeer.SignalData | string): void;
    send(data: string | ArrayBuffer | Blob | ArrayBufferView): void;
    destroy(onError?: (err?: Error) => void): void;
    readonly connected: boolean;
    readonly destroyed: boolean;
  }

  export = SimplePeer;
}