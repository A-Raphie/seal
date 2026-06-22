import type { Abi } from "viem";

export const proofOfReservesABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_exchangeAdmin",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_exchangeSigner",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AlreadyChallenged",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AlreadyFulfilled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AttestationAlreadyUsed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ECDSAInvalidSignature",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "length",
        "type": "uint256"
      }
    ],
    "name": "ECDSAInvalidSignatureLength",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "ECDSAInvalidSignatureS",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EpochNotClosed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EpochNotFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EpochNotOpen",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "HandleMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidKMSSignatures",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSignature",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotExchangeAdmin",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotFulfilled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotRevealed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "handle",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "SenderNotAllowedToUseHandle",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZamaProtocolUnsupported",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "customer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "attHash",
        "type": "bytes32"
      }
    ],
    "name": "AttestationRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "customer",
        "type": "address"
      }
    ],
    "name": "ChallengeRejected",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "customer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "challenger",
        "type": "address"
      }
    ],
    "name": "ChallengeSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "claimedLiabilities",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "deadline",
        "type": "uint64"
      }
    ],
    "name": "EpochCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "customer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "challenger",
        "type": "address"
      }
    ],
    "name": "FraudProven",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "revealedTotal",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "solvent",
        "type": "bool"
      }
    ],
    "name": "PublicDecryptionFulfilled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bytes32[]",
        "name": "handlesList",
        "type": "bytes32[]"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "abiEncodedCleartexts",
        "type": "bytes"
      }
    ],
    "name": "PublicDecryptionVerified",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "revealer",
        "type": "address"
      }
    ],
    "name": "RevealRequested",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "attestationUsed",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      },
      {
        "internalType": "externalEuint64",
        "name": "ciphertextA",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "proofA",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "signatureA",
        "type": "bytes"
      },
      {
        "internalType": "externalEuint64",
        "name": "ciphertextB",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "proofB",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "signatureB",
        "type": "bytes"
      }
    ],
    "name": "challengeConflictingAttestation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "confidentialProtocolId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "claimedLiabilities",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "windowSeconds",
        "type": "uint64"
      }
    ],
    "name": "createEpoch",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "epochFraudulent",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "exchangeAdmin",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "exchangeSigner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "customer",
        "type": "address"
      },
      {
        "internalType": "bytes32[]",
        "name": "handlesList",
        "type": "bytes32[]"
      },
      {
        "internalType": "bytes",
        "name": "abiEncodedCleartexts",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "decryptionProof",
        "type": "bytes"
      }
    ],
    "name": "fulfillChallenge",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      },
      {
        "internalType": "bytes32[]",
        "name": "handlesList",
        "type": "bytes32[]"
      },
      {
        "internalType": "bytes",
        "name": "abiEncodedCleartexts",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "decryptionProof",
        "type": "bytes"
      }
    ],
    "name": "fulfillPublicDecryption",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "customer",
        "type": "address"
      }
    ],
    "name": "getChallenge",
    "outputs": [
      {
        "internalType": "address",
        "name": "challenger",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "fulfilled",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "fraudProven",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "customer",
        "type": "address"
      }
    ],
    "name": "getChallengeDifferHandle",
    "outputs": [
      {
        "internalType": "ebool",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      }
    ],
    "name": "getEncryptedSolvent",
    "outputs": [
      {
        "internalType": "ebool",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      }
    ],
    "name": "getEncryptedTotal",
    "outputs": [
      {
        "internalType": "euint64",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      }
    ],
    "name": "getEpoch",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "claimedLiabilities",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "deadline",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "revealedTotal",
        "type": "uint64"
      },
      {
        "internalType": "bool",
        "name": "solvent",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "revealed",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "fulfilled",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "attestationCount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      }
    ],
    "name": "isFraudulent",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      }
    ],
    "name": "isSolvent",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextEpochId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      },
      {
        "internalType": "externalEuint64",
        "name": "encryptedBalance",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "inputProof",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "registerAttestation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "epochId",
        "type": "uint256"
      }
    ],
    "name": "requestReveal",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const satisfies Abi;
