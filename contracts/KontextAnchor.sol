// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title KontextAnchor — On-chain digest anchoring for tamper-evident audit trails
/// @notice Stores SHA-256 digest hashes from Kontext compliance checks on Base.
///         Each anchor proves that a specific set of compliance checks ran.
contract KontextAnchor {
    struct Anchor {
        address anchorer;
        bytes32 projectHash;
        uint256 timestamp;
        bool exists;
    }

    mapping(bytes32 => Anchor) public anchors;

    event DigestAnchored(
        bytes32 indexed digest,
        bytes32 indexed projectHash,
        address indexed anchorer,
        uint256 timestamp
    );

    /// @notice Anchor a digest hash on-chain
    /// @param digest The SHA-256 terminal digest from the Kontext digest chain
    /// @param projectHash keccak256 of the project ID for context
    function anchor(bytes32 digest, bytes32 projectHash) external {
        require(!anchors[digest].exists, "digest already anchored");
        anchors[digest] = Anchor({
            anchorer: msg.sender,
            projectHash: projectHash,
            timestamp: block.timestamp,
            exists: true
        });
        emit DigestAnchored(digest, projectHash, msg.sender, block.timestamp);
    }

    /// @notice Check whether a digest has been anchored
    /// @param digest The digest to check
    /// @return True if the digest exists on-chain
    function verify(bytes32 digest) external view returns (bool) {
        return anchors[digest].exists;
    }

    /// @notice Get full anchor details for a digest
    /// @param digest The digest to look up
    /// @return anchorer The address that submitted the anchor
    /// @return projectHash The project context hash
    /// @return timestamp The block timestamp when anchored
    function getAnchor(bytes32 digest) external view returns (
        address anchorer,
        bytes32 projectHash,
        uint256 timestamp
    ) {
        require(anchors[digest].exists, "not anchored");
        Anchor storage a = anchors[digest];
        return (a.anchorer, a.projectHash, a.timestamp);
    }
}
