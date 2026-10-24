use anchor_lang::prelude::*;

use crate::error::PassportError;
use crate::state::{Bounty, BOUNTY_SEED};

#[derive(Accounts)]
pub struct CancelBounty<'info> {
    // Seeds come from the stored sponsor so a stranger gets NotSponsor rather
    // than a seeds mismatch; has_one then ties the bounty to the signer.
    #[account(
        mut,
        seeds = [BOUNTY_SEED, bounty.sponsor.as_ref(), bounty.skill_hash.as_ref(), bounty.nonce.to_le_bytes().as_ref()],
        bump = bounty.bump,
        has_one = sponsor @ PassportError::NotSponsor,
        constraint = bounty.claimed_by.is_none() @ PassportError::BountyAlreadyClaimed,
        close = sponsor,
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(mut)]
    pub sponsor: Signer<'info>,
}

pub fn cancel_bounty(_ctx: Context<CancelBounty>) -> Result<()> {
    Ok(())
}
