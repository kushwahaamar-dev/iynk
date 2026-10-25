//! iynk Proof of Build.
//!
//! The iynk server re-runs a learner's deterministic lab run and, when it
//! passes, the issuer key records a Credential PDA for (learner, skill). Anyone
//! can sponsor a skill by escrowing lamports in a Bounty PDA; matching bounties
//! are paid to the learner in the same instruction that issues the credential.

use anchor_lang::prelude::*;

pub mod error;
pub mod events;
pub mod instructions;
pub mod skill;
pub mod state;

use instructions::*;

declare_id!("BYFLDTLNi946Z8jT4JnxgE8Cpzkr9ud7tSrnThFTv31w");

#[program]
pub mod iynk_passport {
    use super::*;

    /// Creates the Config PDA. Only the program's upgrade authority may call it.
    pub fn initialize(ctx: Context<Initialize>, issuer: Pubkey) -> Result<()> {
        instructions::initialize::initialize(ctx, issuer)
    }

    /// Rotates the key allowed to issue credentials.
    pub fn set_issuer(ctx: Context<SetIssuer>, issuer: Pubkey) -> Result<()> {
        instructions::set_issuer::set_issuer(ctx, issuer)
    }

    /// Records a verified credential and pays every bounty passed in
    /// `remaining_accounts` (each writable, same skill, unclaimed, open or
    /// reserved for this learner).
    pub fn issue_credential<'info>(
        ctx: Context<'_, '_, 'info, 'info, IssueCredential<'info>>,
        skill_id: String,
        skill_hash: [u8; 32],
        replay_hash: [u8; 32],
        score: u16,
    ) -> Result<()> {
        instructions::issue_credential::issue_credential(ctx, skill_id, skill_hash, replay_hash, score)
    }

    /// Escrows `amount` lamports for whoever next earns `skill_id`
    /// (or only `learner`, when set).
    pub fn create_bounty(
        ctx: Context<CreateBounty>,
        skill_id: String,
        skill_hash: [u8; 32],
        learner: Option<Pubkey>,
        amount: u64,
        nonce: u64,
    ) -> Result<()> {
        instructions::create_bounty::create_bounty(ctx, skill_id, skill_hash, learner, amount, nonce)
    }

    /// Closes an unclaimed bounty and returns everything it holds to the sponsor.
    pub fn cancel_bounty(ctx: Context<CancelBounty>) -> Result<()> {
        instructions::cancel_bounty::cancel_bounty(ctx)
    }
}
