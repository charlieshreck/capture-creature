// Isometric coordinate utilities
// Tile size: 64x32 diamond tiles

export const TILE_W = 64;
export const TILE_H = 32;

// Convert cartesian grid coords to isometric screen coords
export function cartToIso(cartX, cartY) {
  return {
    x: (cartX - cartY) * (TILE_W / 2),
    y: (cartX + cartY) * (TILE_H / 2),
  };
}

// Convert isometric screen coords back to cartesian grid coords
export function isoToCart(isoX, isoY) {
  return {
    x: (isoX / (TILE_W / 2) + isoY / (TILE_H / 2)) / 2,
    y: (isoY / (TILE_H / 2) - isoX / (TILE_W / 2)) / 2,
  };
}

// Calculate depth for sorting (further from camera = rendered later)
export function isoDepth(cartX, cartY, layer) {
  return cartX + cartY + (layer || 0);
}

// Tile types
export const TILE = {
  VOID: 0,
  GRASS: 1,
  STONE: 2,
  WOOD: 3,
  SAND: 4,
  WATER: 5,
  GENERATOR: 6,
  GOLD_GEN: 7,
};

// Block types (placed on top of ground)
export const BLOCK = {
  NONE: 0,
  WOOL: 10,
  WOOD: 11,
  STONE: 12,
  OBSIDIAN: 13,
  SAFE_BLUE: 20,
  SAFE_RED: 21,
};

// Block HP values
export const BLOCK_HP = {
  10: 20,   // wool
  11: 40,   // wood
  12: 80,   // stone
  13: 200,  // obsidian
  20: 150,  // blue safe
  21: 150,  // red safe
};
