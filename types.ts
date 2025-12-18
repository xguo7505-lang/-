
export interface UserTexture {
  id: string;
  url: string;
  texture: any; // THREE.Texture
}

export enum AppState {
  SETUP = 'SETUP',
  LOADING = 'LOADING',
  MAGIC = 'MAGIC'
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}
