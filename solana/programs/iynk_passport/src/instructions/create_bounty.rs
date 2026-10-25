use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::error::PassportError;
use crate::skill;
use crate::state::{Bounty, BOUNTY_SEED};

#[derive(Accounts)]
#[instruction(skill_id: String, skill_hash: [u8; 32], learner: Option<Pubkey>, amount: u64, nonce: u64)]
pub struct CreateBounty<'info> {
    #[account(
        init,
        payer = sponsor,
        space = 8 + Bounty::INIT_SPACE,
        seeds = [BOUNTY_SEED, sponsor.key().as_ref(), skill_hash.as_ref(), nonce.to_le_bytes().as_ref()],
        bump,
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(mut)]
    pub sponsor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_bounty(
    ctx: Context<CreateBounty>,
    skill_id: String,
    skill_hash: [u8; 32],
    learner: Option<Pubkey>,
    amount: u64,
    nonce: u64,
) -> Result<()> {
    skill::validate(&skill_id, &skill_hash)?;
    // The payout may land in a wallet that holds nothing yet, which the
    // runtime only accepts if it leaves that wallet rent-exempt.
    require!(
        amount >= Rent::get()?.minimum_balance(0),
        PassportError::BountyTooSmall
    );

    transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.sponsor.to_account_info(),
                to: ctx.accounts.bounty.to_account_info(),
            },
        ),
        amount,
    )?;

    ctx.accounts.bounty.set_inner(Bounty {
        sponsor: ctx.accounts.sponsor.key(),
        skill_hash,
        skill_id,
        learner,
        amount,
        created_at: Clock::get()?.unix_timestamp,
        claimed_by: None,
        nonce,
        bump: ctx.bumps.bounty,
    });
    Ok(())
}
