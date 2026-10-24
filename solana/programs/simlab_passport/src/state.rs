use anchor_lang::prelude::*;

use crate::skill::MAX_SKILL_ID_LEN;

#[constant]
pub const CONFIG_SEED: &[u8] = b"config";
#[constant]
pub const CREDENTIAL_SEED: &[u8] = b"cred";
#[constant]
pub const BOUNTY_SEED: &[u8] = b"bounty";

/// PDA ["config"].
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub issuer: Pubkey,
    pub bump: u8,
}

/// PDA ["cred", learner, skill_hash]. One per learner and skill; never transferable.
#[account]
#[derive(InitSpace)]
pub struct Credential {
    pub learner: Pubkey,
    pub skill_hash: [u8; 32],
    #[max_len(MAX_SKILL_ID_LEN)]
    pub skill_id: String,
    pub replay_hash: [u8; 32],
    pub score: u16,
    pub issued_at: i64,
    pub issuer: Pubkey,
    pub bump: u8,
}

/// PDA ["bounty", sponsor, skill_hash, nonce as u64 little-endian].
/// Holds its rent plus `amount` lamports until it is claimed or cancelled.
#[account]
#[derive(InitSpace)]
pub struct Bounty {
    pub sponsor: Pubkey,
    pub skill_hash: [u8; 32],
    #[max_len(MAX_SKILL_ID_LEN)]
    pub skill_id: String,
    pub learner: Option<Pubkey>,
    pub amount: u64,
    pub created_at: i64,
    pub claimed_by: Option<Pubkey>,
    pub nonce: u64,
    pub bump: u8,
}
