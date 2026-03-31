/**
 * Kontext SDK Merkle Tree Implementation
 * Binary Merkle tree for batch evidence commitments and inclusion proofs.
 * Ported from public repo, adapted to private SDK's action-based model.
 */

import { createHash } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface MerkleProof {
  leaf: string;
  index: number;
  proof: string[];
  root: string;
}

export interface MerkleBatch {
  batchId: string;
  merkleRoot: string;
  entryCount: number;
  entryDigests: string[];
  createdAt: Date;
  anchored: boolean;
}

// ============================================================================
// SHA-256 Helper (inline — no dependency on digest.ts)
// ============================================================================

function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

// ============================================================================
// MerkleTree Class
// ============================================================================

/**
 * Binary Merkle Tree implementation.
 * Used for creating efficient batch proofs of evidence integrity.
 */
export class MerkleTree {
  private leaves: string[];
  private layers: string[][];
  private root: string;

  constructor(leaves: string[]) {
    if (leaves.length === 0) {
      throw new Error('Cannot create Merkle tree with no leaves');
    }
    this.leaves = [...leaves];
    this.layers = this.buildTree(this.leaves);
    this.root = this.layers[this.layers.length - 1]![0]!;
  }

  private buildTree(leaves: string[]): string[][] {
    const layers: string[][] = [];
    let currentLayer = [...leaves];
    layers.push(currentLayer);

    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i]!;
        const right = i + 1 < currentLayer.length ? currentLayer[i + 1]! : left;
        nextLayer.push(this.hashPair(left, right));
      }
      layers.push(nextLayer);
      currentLayer = nextLayer;
    }

    return layers;
  }

  private hashPair(left: string, right: string): string {
    const [first, second] = left < right ? [left, right] : [right, left];
    return sha256(`${first}${second}`);
  }

  getRoot(): string {
    return this.root;
  }

  getLeafCount(): number {
    return this.leaves.length;
  }

  getLeaves(): string[] {
    return [...this.leaves];
  }

  getLayers(): string[][] {
    return this.layers.map((layer) => [...layer]);
  }

  getDepth(): number {
    return this.layers.length - 1;
  }

  getProof(index: number): string[] {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error(`Invalid leaf index: ${index}`);
    }

    const proof: string[] = [];
    let currentIndex = index;

    for (let layer = 0; layer < this.layers.length - 1; layer++) {
      const currentLayer = this.layers[layer]!;
      const siblingIndex = currentIndex % 2 === 1 ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < currentLayer.length) {
        proof.push(currentLayer[siblingIndex]!);
      } else {
        proof.push(currentLayer[currentIndex]!);
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  getProofObject(index: number): MerkleProof {
    return {
      leaf: this.leaves[index]!,
      index,
      proof: this.getProof(index),
      root: this.root,
    };
  }

  static verify(leaf: string, proof: string[], root: string, index?: number): boolean {
    let computedHash = leaf;

    for (let i = 0; i < proof.length; i++) {
      const sibling = proof[i]!;
      if (index !== undefined) {
        const isRightNode = Math.floor(index / Math.pow(2, i)) % 2 === 1;
        if (isRightNode) {
          computedHash = MerkleTree.hashPairStatic(sibling, computedHash);
        } else {
          computedHash = MerkleTree.hashPairStatic(computedHash, sibling);
        }
      } else {
        computedHash = MerkleTree.hashPairStatic(computedHash, sibling);
      }
    }

    return computedHash === root;
  }

  private static hashPairStatic(left: string, right: string): string {
    const [first, second] = left < right ? [left, right] : [right, left];
    return sha256(`${first}${second}`);
  }

  static verifyProof(proof: MerkleProof): boolean {
    return MerkleTree.verify(proof.leaf, proof.proof, proof.root, proof.index);
  }

  addLeaf(leaf: string): void {
    this.leaves.push(leaf);
    this.layers = this.buildTree(this.leaves);
    this.root = this.layers[this.layers.length - 1]![0]!;
  }

  getLeaf(index: number): string {
    if (index < 0 || index >= this.leaves.length) {
      throw new Error(`Invalid leaf index: ${index}`);
    }
    return this.leaves[index]!;
  }

  findLeafIndex(leaf: string): number {
    return this.leaves.indexOf(leaf);
  }

  toJSON(): { leaves: string[]; root: string; depth: number } {
    return {
      leaves: this.leaves,
      root: this.root,
      depth: this.getDepth(),
    };
  }

  static fromJSON(json: { leaves: string[] }): MerkleTree {
    return new MerkleTree(json.leaves);
  }
}

// ============================================================================
// Batch Functions (adapted from session-based to digest-based model)
// ============================================================================

/**
 * Create a Merkle batch from an array of digest strings.
 */
export function createMerkleBatch(
  digests: string[],
  batchIdPrefix: string = 'batch',
): MerkleBatch {
  const merkleRoot = digests.length > 0 ? computeMerkleRoot(digests) : '0'.repeat(64);
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 10);

  return {
    batchId: `${batchIdPrefix}_${timestamp}_${randomSuffix}`,
    merkleRoot,
    entryCount: digests.length,
    entryDigests: digests,
    createdAt: new Date(),
    anchored: false,
  };
}

/**
 * Verify a digest is included in a batch at a specific index.
 */
export function verifyDigestInBatch(
  batch: MerkleBatch,
  digest: string,
  index: number,
): boolean {
  if (index < 0 || index >= batch.entryDigests.length) {
    return false;
  }

  if (batch.entryDigests[index] !== digest) {
    return false;
  }

  const proof = generateMerkleProof(batch.entryDigests, index);
  return verifyMerkleProof(proof);
}

/**
 * Merge multiple batches into a single batch.
 */
export function mergeBatches(batches: MerkleBatch[]): MerkleBatch {
  if (batches.length === 0) {
    throw new Error('Cannot merge empty batch array');
  }

  const allDigests: string[] = [];
  for (const batch of batches) {
    allDigests.push(...batch.entryDigests);
  }

  const tree = new MerkleTree(allDigests);
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 10);

  return {
    batchId: `merged_${timestamp}_${randomSuffix}`,
    merkleRoot: tree.getRoot(),
    entryCount: allDigests.length,
    entryDigests: allDigests,
    createdAt: new Date(),
    anchored: false,
  };
}

/**
 * Create a compact proof for multiple leaves.
 */
export function createMultiProof(
  tree: MerkleTree,
  indices: number[],
): { leaves: string[]; indices: number[]; proof: string[]; root: string } {
  const sortedIndices = [...indices].sort((a, b) => a - b);
  const leaves = sortedIndices.map((i) => tree.getLeaf(i));

  const proofSet = new Set<string>();
  for (const index of sortedIndices) {
    const singleProof = tree.getProof(index);
    singleProof.forEach((hash) => proofSet.add(hash));
  }
  leaves.forEach((leaf) => proofSet.delete(leaf));

  return {
    leaves,
    indices: sortedIndices,
    proof: Array.from(proofSet),
    root: tree.getRoot(),
  };
}

/**
 * Calculate the proof size for a tree with n leaves.
 */
export function calculateProofSize(leafCount: number): number {
  if (leafCount <= 0) return 0;
  return Math.ceil(Math.log2(leafCount));
}

// ============================================================================
// Leaf Hashing
// ============================================================================

/**
 * Hash a value to create a Merkle leaf (double-hash to prevent length extension attacks).
 */
export function hashLeaf(value: string | Buffer): string {
  return sha256(sha256(typeof value === 'string' ? value : value.toString('hex')));
}

// ============================================================================
// Legacy / Standalone Functions
// ============================================================================

export function hashNodes(left: string, right: string): string {
  const sorted = [left, right].sort();
  return sha256(sorted[0]! + sorted[1]!);
}

export function buildMerkleTree(leaves: string[]): string[][] {
  if (leaves.length === 0) {
    return [['0'.repeat(64)]];
  }
  if (leaves.length === 1) {
    return [leaves];
  }

  let currentLevel = [...leaves];
  const tree: string[][] = [currentLevel];

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        nextLevel.push(hashNodes(currentLevel[i]!, currentLevel[i + 1]!));
      } else {
        nextLevel.push(currentLevel[i]!);
      }
    }
    currentLevel = nextLevel;
    tree.push(currentLevel);
  }

  return tree;
}

export function computeMerkleRoot(leaves: string[]): string {
  const tree = buildMerkleTree(leaves);
  return tree[tree.length - 1]![0]!;
}

export function generateMerkleProof(leaves: string[], index: number): MerkleProof {
  if (index < 0 || index >= leaves.length) {
    throw new Error(`Index ${index} out of bounds for ${leaves.length} leaves`);
  }

  const tree = buildMerkleTree(leaves);
  const proof: string[] = [];
  let currentIndex = index;

  for (let level = 0; level < tree.length - 1; level++) {
    const currentLevel = tree[level]!;
    const siblingIndex = currentIndex % 2 === 1 ? currentIndex - 1 : currentIndex + 1;

    if (siblingIndex < currentLevel.length) {
      proof.push(currentLevel[siblingIndex]!);
    }

    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    leaf: leaves[index]!,
    index,
    proof,
    root: tree[tree.length - 1]![0]!,
  };
}

export function verifyMerkleProof(proof: MerkleProof): boolean {
  let currentHash = proof.leaf;
  let currentIndex = proof.index;

  for (const sibling of proof.proof) {
    const isRightNode = currentIndex % 2 === 1;
    if (isRightNode) {
      currentHash = hashNodes(sibling, currentHash);
    } else {
      currentHash = hashNodes(currentHash, sibling);
    }
    currentIndex = Math.floor(currentIndex / 2);
  }

  return currentHash === proof.root;
}
