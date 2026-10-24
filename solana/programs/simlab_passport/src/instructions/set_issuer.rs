use anchor_lang::prelude::*;

use crate::error::PassportError;
use crate::state::{Config, CONFIG_SEED};

#[derive(Accounts)]
pub struct SetIssuer<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = admin @ PassportError::NotAdmin,
    )]
    pub config: Account<'info, Config>,
}

pub fn set_issuer(ctx: Context<SetIssuer>, issuer: Pubkey) -> Result<()> {
    ctx.accounts.config.issuer = issuer;
    Ok(())
}
