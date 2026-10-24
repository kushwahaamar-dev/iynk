/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/simlab_passport.json`.
 */
export type SimlabPassport = {
  "address": "BYFLDTLNi946Z8jT4JnxgE8Cpzkr9ud7tSrnThFTv31w",
  "metadata": {
    "name": "simlabPassport",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "SimLab Proof of Build: verified skill credentials and escrowed sponsor bounties"
  },
  "instructions": [
    {
      "name": "cancelBounty",
      "docs": [
        "Closes an unclaimed bounty and returns everything it holds to the sponsor."
      ],
      "discriminator": [
        79,
        65,
        107,
        143,
        128,
        165,
        135,
        46
      ],
      "accounts": [
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bounty.sponsor",
                "account": "bounty"
              },
              {
                "kind": "account",
                "path": "bounty.skill_hash",
                "account": "bounty"
              },
              {
                "kind": "account",
                "path": "bounty.nonce",
                "account": "bounty"
              }
            ]
          }
        },
        {
          "name": "sponsor",
          "writable": true,
          "signer": true,
          "relations": [
            "bounty"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "createBounty",
      "docs": [
        "Escrows `amount` lamports for whoever next earns `skill_id`",
        "(or only `learner`, when set)."
      ],
      "discriminator": [
        122,
        90,
        14,
        143,
        8,
        125,
        200,
        2
      ],
      "accounts": [
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "sponsor"
              },
              {
                "kind": "arg",
                "path": "skillHash"
              },
              {
                "kind": "arg",
                "path": "nonce"
              }
            ]
          }
        },
        {
          "name": "sponsor",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "skillId",
          "type": "string"
        },
        {
          "name": "skillHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "learner",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "nonce",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize",
      "docs": [
        "Creates the Config PDA. Only the program's upgrade authority may call it."
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "programData",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  156,
                  150,
                  20,
                  43,
                  52,
                  125,
                  173,
                  149,
                  254,
                  244,
                  83,
                  247,
                  155,
                  95,
                  66,
                  186,
                  44,
                  101,
                  174,
                  250,
                  255,
                  202,
                  222,
                  79,
                  12,
                  143,
                  31,
                  85,
                  227,
                  210,
                  53,
                  38
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                2,
                168,
                246,
                145,
                78,
                136,
                161,
                176,
                226,
                16,
                21,
                62,
                247,
                99,
                174,
                43,
                0,
                194,
                185,
                61,
                22,
                193,
                36,
                210,
                192,
                83,
                122,
                16,
                4,
                128,
                0,
                0
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "issuer",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "issueCredential",
      "docs": [
        "Records a verified credential and pays every bounty passed in",
        "`remaining_accounts` (each writable, same skill, unclaimed, open or",
        "reserved for this learner)."
      ],
      "discriminator": [
        255,
        193,
        171,
        224,
        68,
        171,
        194,
        87
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "credential",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  114,
                  101,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "learner"
              },
              {
                "kind": "arg",
                "path": "skillHash"
              }
            ]
          }
        },
        {
          "name": "learner",
          "docs": [
            "payouts, and the owner check keeps program accounts out."
          ],
          "writable": true
        },
        {
          "name": "issuer",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "skillId",
          "type": "string"
        },
        {
          "name": "skillHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "replayHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "score",
          "type": "u16"
        }
      ]
    },
    {
      "name": "setIssuer",
      "docs": [
        "Rotates the key allowed to issue credentials."
      ],
      "discriminator": [
        122,
        240,
        209,
        127,
        179,
        164,
        175,
        206
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "issuer",
          "type": "pubkey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bounty",
      "discriminator": [
        237,
        16,
        105,
        198,
        19,
        69,
        242,
        234
      ]
    },
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "credential",
      "discriminator": [
        145,
        44,
        68,
        220,
        67,
        46,
        100,
        135
      ]
    }
  ],
  "events": [
    {
      "name": "bountyPaid",
      "discriminator": [
        60,
        72,
        10,
        171,
        122,
        59,
        238,
        148
      ]
    },
    {
      "name": "credentialIssued",
      "discriminator": [
        194,
        216,
        28,
        159,
        89,
        29,
        72,
        177
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notUpgradeAuthority",
      "msg": "Only the program's upgrade authority can initialize the config"
    },
    {
      "code": 6001,
      "name": "notAdmin",
      "msg": "Only the config admin can do this"
    },
    {
      "code": 6002,
      "name": "notIssuer",
      "msg": "Only the configured issuer can issue credentials"
    },
    {
      "code": 6003,
      "name": "notSponsor",
      "msg": "Only the bounty's sponsor can cancel it"
    },
    {
      "code": 6004,
      "name": "skillIdLength",
      "msg": "skill_id must be 1 to 64 bytes"
    },
    {
      "code": 6005,
      "name": "skillIdCharset",
      "msg": "skill_id must be printable ASCII without spaces"
    },
    {
      "code": 6006,
      "name": "skillHashMismatch",
      "msg": "skill_hash must be sha256 of skill_id"
    },
    {
      "code": 6007,
      "name": "learnerNotWallet",
      "msg": "The learner must be a wallet (an account owned by the System Program)"
    },
    {
      "code": 6008,
      "name": "bountyTooSmall",
      "msg": "A bounty must hold at least the rent-exempt minimum of an empty account"
    },
    {
      "code": 6009,
      "name": "bountyNotWritable",
      "msg": "Bounty accounts must be passed as writable"
    },
    {
      "code": 6010,
      "name": "bountySkillMismatch",
      "msg": "The bounty is for a different skill"
    },
    {
      "code": 6011,
      "name": "bountyLearnerMismatch",
      "msg": "The bounty is reserved for a different learner"
    },
    {
      "code": 6012,
      "name": "bountyAlreadyClaimed",
      "msg": "The bounty has already been claimed"
    }
  ],
  "types": [
    {
      "name": "bounty",
      "docs": [
        "PDA [\"bounty\", sponsor, skill_hash, nonce as u64 little-endian].",
        "Holds its rent plus `amount` lamports until it is claimed or cancelled."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sponsor",
            "type": "pubkey"
          },
          {
            "name": "skillHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "skillId",
            "type": "string"
          },
          {
            "name": "learner",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "claimedBy",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bountyPaid",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bounty",
            "type": "pubkey"
          },
          {
            "name": "learner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "config",
      "docs": [
        "PDA [\"config\"]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "issuer",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "credential",
      "docs": [
        "PDA [\"cred\", learner, skill_hash]. One per learner and skill; never transferable."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "learner",
            "type": "pubkey"
          },
          {
            "name": "skillHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "skillId",
            "type": "string"
          },
          {
            "name": "replayHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "score",
            "type": "u16"
          },
          {
            "name": "issuedAt",
            "type": "i64"
          },
          {
            "name": "issuer",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "credentialIssued",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "learner",
            "type": "pubkey"
          },
          {
            "name": "skillId",
            "type": "string"
          },
          {
            "name": "replayHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "score",
            "type": "u16"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "bountySeed",
      "type": "bytes",
      "value": "[98, 111, 117, 110, 116, 121]"
    },
    {
      "name": "configSeed",
      "type": "bytes",
      "value": "[99, 111, 110, 102, 105, 103]"
    },
    {
      "name": "credentialSeed",
      "type": "bytes",
      "value": "[99, 114, 101, 100]"
    }
  ]
};
