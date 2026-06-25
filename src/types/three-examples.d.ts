declare module 'three/examples/jsm/loaders/GLTFLoader' {
  import { LoadingManager } from 'three';

  export type GLTF = any;

  export class GLTFLoader {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: Error | ProgressEvent) => void
    ): void;
    parse(
      data: ArrayBuffer | string,
      path: string,
      onLoad: (gltf: GLTF) => void,
      onError?: (event: Error | ProgressEvent) => void
    ): void;
    setDRACOLoader?(dracoLoader: any): void;
  }

  export default GLTFLoader;
}
