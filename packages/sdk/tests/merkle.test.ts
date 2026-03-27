/**
 * Merkle Tree Tests
 * Ported from public repo, adapted for private SDK
 */

import { createHash } from 'crypto';
import { describe, it, expect } from 'vitest';
import {
  MerkleTree,
  hashNodes,
  buildMerkleTree,
  computeMerkleRoot,
  generateMerkleProof,
  verifyMerkleProof,
  createMerkleBatch,
  verifyDigestInBatch,
  hashLeaf,
  calculateProofSize,
  mergeBatches,
  createMultiProof,
} from '../src/merkle.js';
import type { MerkleProof } from '../src/merkle.js';

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

// ============================================================================
// hashNodes
// ============================================================================

describe('hashNodes', () => {
  it('should produce deterministic hash for two nodes', () => {
    const left = sha256('left');
    const right = sha256('right');
    expect(hashNodes(left, right)).toBe(hashNodes(left, right));
  });

  it('should produce same hash regardless of argument order (sorted)', () => {
    const a = sha256('a');
    const b = sha256('b');
    expect(hashNodes(a, b)).toBe(hashNodes(b, a));
  });

  it('should produce 64 character hex string', () => {
    const hash = hashNodes(sha256('left'), sha256('right'));
    expect(hash).toHaveLength(64);
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true);
  });

  it('should produce different hash for different inputs', () => {
    const hash1 = hashNodes(sha256('a'), sha256('b'));
    const hash2 = hashNodes(sha256('c'), sha256('d'));
    expect(hash1).not.toBe(hash2);
  });
});

// ============================================================================
// buildMerkleTree
// ============================================================================

describe('buildMerkleTree', () => {
  it('should handle empty array', () => {
    const tree = buildMerkleTree([]);
    expect(tree).toHaveLength(1);
    expect(tree[0]![0]).toBe('0'.repeat(64));
  });

  it('should handle single leaf', () => {
    const leaf = sha256('single');
    const tree = buildMerkleTree([leaf]);
    expect(tree).toHaveLength(1);
    expect(tree[0]).toEqual([leaf]);
  });

  it('should handle two leaves', () => {
    const leaf1 = sha256('leaf1');
    const leaf2 = sha256('leaf2');
    const tree = buildMerkleTree([leaf1, leaf2]);
    expect(tree).toHaveLength(2);
    expect(tree[0]).toEqual([leaf1, leaf2]);
    expect(tree[1]).toHaveLength(1);
    expect(tree[1]![0]).toBe(hashNodes(leaf1, leaf2));
  });

  it('should handle three leaves (odd number)', () => {
    const leaf1 = sha256('leaf1');
    const leaf2 = sha256('leaf2');
    const leaf3 = sha256('leaf3');
    const tree = buildMerkleTree([leaf1, leaf2, leaf3]);
    expect(tree).toHaveLength(3);
    expect(tree[0]).toEqual([leaf1, leaf2, leaf3]);
    expect(tree[1]).toHaveLength(2);
    expect(tree[1]![0]).toBe(hashNodes(leaf1, leaf2));
    expect(tree[1]![1]).toBe(leaf3);
    expect(tree[2]).toHaveLength(1);
  });

  it('should handle four leaves (power of 2)', () => {
    const leaves = [1, 2, 3, 4].map((i) => sha256(`leaf${i}`));
    const tree = buildMerkleTree(leaves);
    expect(tree).toHaveLength(3);
    expect(tree[0]).toEqual(leaves);
    expect(tree[1]).toHaveLength(2);
    expect(tree[2]).toHaveLength(1);
  });

  it('should handle five leaves', () => {
    const leaves = [1, 2, 3, 4, 5].map((i) => sha256(`leaf${i}`));
    const tree = buildMerkleTree(leaves);
    expect(tree[0]).toEqual(leaves);
    expect(tree[tree.length - 1]).toHaveLength(1);
  });

  it('should handle large number of leaves', () => {
    const leaves = Array.from({ length: 100 }, (_, i) => sha256(`leaf${i}`));
    const tree = buildMerkleTree(leaves);
    expect(tree[0]).toEqual(leaves);
    expect(tree[tree.length - 1]).toHaveLength(1);
  });
});

// ============================================================================
// computeMerkleRoot
// ============================================================================

describe('computeMerkleRoot', () => {
  it('should return zero hash for empty array', () => {
    expect(computeMerkleRoot([])).toBe('0'.repeat(64));
  });

  it('should return leaf for single element', () => {
    const leaf = sha256('single');
    expect(computeMerkleRoot([leaf])).toBe(leaf);
  });

  it('should compute correct root for two leaves', () => {
    const leaf1 = sha256('leaf1');
    const leaf2 = sha256('leaf2');
    expect(computeMerkleRoot([leaf1, leaf2])).toBe(hashNodes(leaf1, leaf2));
  });

  it('should be deterministic', () => {
    const leaves = [1, 2, 3, 4].map((i) => sha256(`leaf${i}`));
    expect(computeMerkleRoot(leaves)).toBe(computeMerkleRoot(leaves));
  });

  it('should produce different root for different leaves', () => {
    const leaves1 = [1, 2, 3].map((i) => sha256(`a${i}`));
    const leaves2 = [1, 2, 3].map((i) => sha256(`b${i}`));
    expect(computeMerkleRoot(leaves1)).not.toBe(computeMerkleRoot(leaves2));
  });

  it('should be consistent for same inputs', () => {
    const leaf1 = sha256('leaf1');
    const leaf2 = sha256('leaf2');
    expect(computeMerkleRoot([leaf1, leaf2])).toBe(computeMerkleRoot([leaf1, leaf2]));
  });
});

// ============================================================================
// generateMerkleProof
// ============================================================================

describe('generateMerkleProof', () => {
  it('should throw for negative index', () => {
    expect(() => generateMerkleProof([sha256('leaf1')], -1)).toThrow('out of bounds');
  });

  it('should throw for index >= length', () => {
    const leaves = [sha256('leaf1'), sha256('leaf2')];
    expect(() => generateMerkleProof(leaves, 2)).toThrow('out of bounds');
  });

  it('should generate proof for single leaf', () => {
    const leaf = sha256('single');
    const proof = generateMerkleProof([leaf], 0);
    expect(proof.leaf).toBe(leaf);
    expect(proof.index).toBe(0);
    expect(proof.proof).toHaveLength(0);
    expect(proof.root).toBe(leaf);
  });

  it('should generate proof for two leaves - first leaf', () => {
    const leaf1 = sha256('leaf1');
    const leaf2 = sha256('leaf2');
    const proof = generateMerkleProof([leaf1, leaf2], 0);
    expect(proof.leaf).toBe(leaf1);
    expect(proof.index).toBe(0);
    expect(proof.proof).toHaveLength(1);
    expect(proof.proof[0]).toBe(leaf2);
    expect(proof.root).toBe(hashNodes(leaf1, leaf2));
  });

  it('should generate proof for two leaves - second leaf', () => {
    const leaf1 = sha256('leaf1');
    const leaf2 = sha256('leaf2');
    const proof = generateMerkleProof([leaf1, leaf2], 1);
    expect(proof.leaf).toBe(leaf2);
    expect(proof.index).toBe(1);
    expect(proof.proof).toHaveLength(1);
    expect(proof.proof[0]).toBe(leaf1);
    expect(proof.root).toBe(hashNodes(leaf1, leaf2));
  });

  it('should generate proof for four leaves', () => {
    const leaves = [1, 2, 3, 4].map((i) => sha256(`leaf${i}`));
    for (let i = 0; i < leaves.length; i++) {
      const proof = generateMerkleProof(leaves, i);
      expect(proof.leaf).toBe(leaves[i]);
      expect(proof.index).toBe(i);
      expect(proof.root).toBe(computeMerkleRoot(leaves));
    }
  });

  it('should generate proof for odd number of leaves', () => {
    const leaves = [1, 2, 3, 4, 5].map((i) => sha256(`leaf${i}`));
    const root = computeMerkleRoot(leaves);
    for (let i = 0; i < leaves.length; i++) {
      const proof = generateMerkleProof(leaves, i);
      expect(proof.leaf).toBe(leaves[i]);
      expect(proof.root).toBe(root);
    }
  });
});

// ============================================================================
// verifyMerkleProof
// ============================================================================

describe('verifyMerkleProof', () => {
  it('should verify valid proof for single leaf', () => {
    const leaf = sha256('single');
    const proof = generateMerkleProof([leaf], 0);
    expect(verifyMerkleProof(proof)).toBe(true);
  });

  it('should verify valid proof for two leaves', () => {
    const leaves = [sha256('leaf1'), sha256('leaf2')];
    expect(verifyMerkleProof(generateMerkleProof(leaves, 0))).toBe(true);
    expect(verifyMerkleProof(generateMerkleProof(leaves, 1))).toBe(true);
  });

  it('should verify valid proof for four leaves', () => {
    const leaves = [1, 2, 3, 4].map((i) => sha256(`leaf${i}`));
    for (let i = 0; i < leaves.length; i++) {
      expect(verifyMerkleProof(generateMerkleProof(leaves, i))).toBe(true);
    }
  });

  it('should verify valid proof for large tree', () => {
    const leaves = Array.from({ length: 64 }, (_, i) => sha256(`leaf${i}`));
    for (const i of [0, 15, 31, 47, 63]) {
      expect(verifyMerkleProof(generateMerkleProof(leaves, i))).toBe(true);
    }
  });

  it('should reject proof with wrong leaf', () => {
    const leaves = [sha256('leaf1'), sha256('leaf2')];
    const proof = generateMerkleProof(leaves, 0);
    const tampered: MerkleProof = { ...proof, leaf: sha256('wrong leaf') };
    expect(verifyMerkleProof(tampered)).toBe(false);
  });

  it('should reject proof with wrong root', () => {
    const leaves = [sha256('leaf1'), sha256('leaf2')];
    const proof = generateMerkleProof(leaves, 0);
    const tampered: MerkleProof = { ...proof, root: sha256('wrong root') };
    expect(verifyMerkleProof(tampered)).toBe(false);
  });

  it('should reject proof with tampered sibling', () => {
    const leaves = [sha256('leaf1'), sha256('leaf2')];
    const proof = generateMerkleProof(leaves, 0);
    const tampered: MerkleProof = { ...proof, proof: [sha256('wrong sibling')] };
    expect(verifyMerkleProof(tampered)).toBe(false);
  });

  it('should handle proof with different index', () => {
    const leaves = [sha256('leaf1'), sha256('leaf2'), sha256('leaf3'), sha256('leaf4')];
    const proof = generateMerkleProof(leaves, 0);
    expect(verifyMerkleProof(proof)).toBe(true);
  });

  it('should reject proof with missing path element', () => {
    const leaves = [1, 2, 3, 4].map((i) => sha256(`leaf${i}`));
    const proof = generateMerkleProof(leaves, 0);
    const tampered: MerkleProof = { ...proof, proof: proof.proof.slice(0, -1) };
    expect(verifyMerkleProof(tampered)).toBe(false);
  });
});

// ============================================================================
// createMerkleBatch / verifyDigestInBatch
// ============================================================================

describe('createMerkleBatch', () => {
  it('should create batch with correct merkle root', () => {
    const digests = [1, 2, 3].map((i) => sha256(`session${i}`));
    const batch = createMerkleBatch(digests);
    expect(batch.merkleRoot).toBe(computeMerkleRoot(digests));
  });

  it('should include all entry digests', () => {
    const digests = [1, 2, 3, 4, 5].map((i) => sha256(`session${i}`));
    const batch = createMerkleBatch(digests);
    expect(batch.entryDigests).toEqual(digests);
    expect(batch.entryCount).toBe(5);
  });

  it('should generate batch ID with prefix', () => {
    const digests = [sha256('session1')];
    const batch = createMerkleBatch(digests);
    expect(batch.batchId).toMatch(/^batch_\d+_[a-z0-9]+$/);
  });

  it('should accept custom prefix', () => {
    const digests = [sha256('session1')];
    const batch = createMerkleBatch(digests, 'custom');
    expect(batch.batchId).toMatch(/^custom_\d+_[a-z0-9]+$/);
  });

  it('should set anchored to false', () => {
    const batch = createMerkleBatch([sha256('session1')]);
    expect(batch.anchored).toBe(false);
  });

  it('should set createdAt to current time', () => {
    const before = new Date();
    const batch = createMerkleBatch([sha256('session1')]);
    const after = new Date();
    expect(batch.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(batch.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should handle empty array', () => {
    const batch = createMerkleBatch([]);
    expect(batch.entryCount).toBe(0);
    expect(batch.entryDigests).toEqual([]);
    expect(batch.merkleRoot).toBe('0'.repeat(64));
  });
});

describe('verifyDigestInBatch', () => {
  it('should verify digest at correct index', () => {
    const digests = [1, 2, 3, 4].map((i) => sha256(`session${i}`));
    const batch = createMerkleBatch(digests);
    for (let i = 0; i < digests.length; i++) {
      expect(verifyDigestInBatch(batch, digests[i]!, i)).toBe(true);
    }
  });

  it('should reject digest at wrong index', () => {
    const digests = [sha256('session1'), sha256('session2')];
    const batch = createMerkleBatch(digests);
    expect(verifyDigestInBatch(batch, digests[0]!, 1)).toBe(false);
  });

  it('should reject digest not in batch', () => {
    const digests = [sha256('session1'), sha256('session2')];
    const batch = createMerkleBatch(digests);
    expect(verifyDigestInBatch(batch, sha256('not in batch'), 0)).toBe(false);
  });

  it('should work with single entry batch', () => {
    const digest = sha256('single session');
    const batch = createMerkleBatch([digest]);
    expect(verifyDigestInBatch(batch, digest, 0)).toBe(true);
  });

  it('should work with large batch', () => {
    const digests = Array.from({ length: 100 }, (_, i) => sha256(`session${i}`));
    const batch = createMerkleBatch(digests);
    for (const i of [0, 25, 50, 75, 99]) {
      expect(verifyDigestInBatch(batch, digests[i]!, i)).toBe(true);
    }
  });

  it('should reject out of bounds index', () => {
    const digests = [sha256('session1')];
    const batch = createMerkleBatch(digests);
    expect(verifyDigestInBatch(batch, digests[0]!, 5)).toBe(false);
    expect(verifyDigestInBatch(batch, digests[0]!, -1)).toBe(false);
  });
});

// ============================================================================
// MerkleTree class
// ============================================================================

describe('MerkleTree class', () => {
  it('should build from leaves and expose root', () => {
    const leaves = [1, 2, 3, 4].map((i) => sha256(`leaf${i}`));
    const tree = new MerkleTree(leaves);
    expect(tree.getRoot()).toHaveLength(64);
    expect(tree.getLeafCount()).toBe(4);
    expect(tree.getDepth()).toBe(2);
  });

  it('should throw on empty leaves', () => {
    expect(() => new MerkleTree([])).toThrow('Cannot create Merkle tree with no leaves');
  });

  it('should verify proof objects', () => {
    const leaves = [1, 2, 3, 4, 5].map((i) => sha256(`leaf${i}`));
    const tree = new MerkleTree(leaves);
    for (let i = 0; i < leaves.length; i++) {
      const proof = tree.getProofObject(i);
      expect(MerkleTree.verifyProof(proof)).toBe(true);
    }
  });

  it('should support addLeaf', () => {
    const leaves = [sha256('a'), sha256('b')];
    const tree = new MerkleTree(leaves);
    const rootBefore = tree.getRoot();
    tree.addLeaf(sha256('c'));
    expect(tree.getLeafCount()).toBe(3);
    expect(tree.getRoot()).not.toBe(rootBefore);
  });

  it('should serialize and deserialize via JSON', () => {
    const leaves = [1, 2, 3].map((i) => sha256(`leaf${i}`));
    const tree = new MerkleTree(leaves);
    const json = tree.toJSON();
    const restored = MerkleTree.fromJSON(json);
    expect(restored.getRoot()).toBe(tree.getRoot());
    expect(restored.getLeafCount()).toBe(tree.getLeafCount());
  });

  it('should find leaf index', () => {
    const leaves = [sha256('a'), sha256('b'), sha256('c')];
    const tree = new MerkleTree(leaves);
    expect(tree.findLeafIndex(sha256('b'))).toBe(1);
    expect(tree.findLeafIndex(sha256('missing'))).toBe(-1);
  });
});

// ============================================================================
// Utility functions
// ============================================================================

describe('hashLeaf', () => {
  it('should double-hash for length extension protection', () => {
    const value = 'test data';
    const result = hashLeaf(value);
    expect(result).toHaveLength(64);
    expect(result).toBe(sha256(sha256(value)));
  });
});

describe('calculateProofSize', () => {
  it('should return 0 for 0 or negative leaves', () => {
    expect(calculateProofSize(0)).toBe(0);
    expect(calculateProofSize(-1)).toBe(0);
  });

  it('should return log2 for power of 2', () => {
    expect(calculateProofSize(1)).toBe(0);
    expect(calculateProofSize(2)).toBe(1);
    expect(calculateProofSize(4)).toBe(2);
    expect(calculateProofSize(8)).toBe(3);
  });
});

describe('mergeBatches', () => {
  it('should merge multiple batches', () => {
    const batch1 = createMerkleBatch([sha256('a'), sha256('b')]);
    const batch2 = createMerkleBatch([sha256('c'), sha256('d')]);
    const merged = mergeBatches([batch1, batch2]);
    expect(merged.entryCount).toBe(4);
    expect(merged.batchId).toMatch(/^merged_/);
  });

  it('should throw on empty array', () => {
    expect(() => mergeBatches([])).toThrow('Cannot merge empty batch array');
  });
});

describe('createMultiProof', () => {
  it('should create proof for multiple indices', () => {
    const leaves = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => sha256(`leaf${i}`));
    const tree = new MerkleTree(leaves);
    const multi = createMultiProof(tree, [0, 3, 7]);
    expect(multi.leaves).toHaveLength(3);
    expect(multi.indices).toEqual([0, 3, 7]);
    expect(multi.root).toBe(tree.getRoot());
  });
});

// ============================================================================
// Edge cases
// ============================================================================

describe('Edge cases', () => {
  it('should handle duplicate leaves', () => {
    const leaf = sha256('duplicate');
    const leaves = [leaf, leaf, leaf];
    const root = computeMerkleRoot(leaves);
    expect(root).toBeDefined();
    for (let i = 0; i < leaves.length; i++) {
      expect(verifyMerkleProof(generateMerkleProof(leaves, i))).toBe(true);
    }
  });

  it('should handle leaves that are all zeros', () => {
    const zeroHash = '0'.repeat(64);
    const leaves = [zeroHash, zeroHash];
    const proof = generateMerkleProof(leaves, 0);
    expect(verifyMerkleProof(proof)).toBe(true);
  });

  it('should handle very large tree (1000 leaves)', () => {
    const leaves = Array.from({ length: 1000 }, (_, i) => sha256(`leaf${i}`));
    const root = computeMerkleRoot(leaves);
    expect(root).toHaveLength(64);
    expect(verifyMerkleProof(generateMerkleProof(leaves, 0))).toBe(true);
    expect(verifyMerkleProof(generateMerkleProof(leaves, 999))).toBe(true);
  });
});
