// Catálogo de skins. Las skins cosméticas se pagan con monedas del juego.
// Para agregar una nueva, usá el comando /agregar-compra.

export interface Skin {
  id: string;
  name: string;
  price: number; // en monedas del juego. 0 = gratis (default).
  // Colores del bloque; se alternan por piso para dar variedad visual.
  colors: number[];
}

export const SKINS: Skin[] = [
  {
    id: 'default',
    name: 'Clásico',
    price: 0,
    colors: [0x6c4bd6, 0x8a63f0, 0xb18cff],
  },
  {
    id: 'candy',
    name: 'Caramelo',
    price: 150,
    colors: [0xff6ec7, 0xff9a3d, 0xffd23f],
  },
  {
    id: 'mint',
    name: 'Menta',
    price: 250,
    colors: [0x3ddc97, 0x7ef0b0, 0xbdf5d6],
  },
  {
    id: 'ocean',
    name: 'Océano',
    price: 300,
    colors: [0x2ec5ff, 0x3ddc97, 0x22e0c8],
  },
  {
    id: 'lava',
    name: 'Lava',
    price: 450,
    colors: [0xff5964, 0xff8f3d, 0xffd23f],
  },
  {
    id: 'neon',
    name: 'Neón',
    price: 600,
    colors: [0x00e5ff, 0xff2bd6, 0x9d4bff],
  },
  {
    id: 'galaxy',
    name: 'Galaxia',
    price: 850,
    colors: [0x6c4bd6, 0x2ec5ff, 0xff6ec7],
  },
  {
    id: 'gold',
    name: 'Oro',
    price: 1200,
    colors: [0xffd23f, 0xffb02e, 0xfff1a8],
  },
];

export function getSkin(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
