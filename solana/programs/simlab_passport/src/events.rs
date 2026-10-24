use anchor_lang::prelude::*;

#[event]
pub struct CredentialIssued {
    pub learner: Pubkey,
    pub skill_id: String,
    pub replay_hash: [u8; 32],
    pub score: u16,
}

#[event]
pub struct BountyPaid {
    pub bounty: Pubkey,
    pub learner: Pubkey,
    pub amount: u64,
}
