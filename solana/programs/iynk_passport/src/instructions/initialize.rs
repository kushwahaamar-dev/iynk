use anchor_lang::prelude::*;
use solana_sdk_ids::bpf_loader_upgradeable;

use crate::error::PassportError;
use crate::state::{Config, CONFIG_SEED};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,

    // The canonical ProgramData of this program. Gating on its upgrade
    // authority stops anyone else from claiming the config after a deploy.
    #[account(
        seeds = [crate::ID.as_ref()],
        bump,
        seeds::program = bpf_loader_upgradeable::ID,
        constraint = program_data.upgrade_authority_address == Some(admin.key())
            @ PassportError::NotUpgradeAuthority,
    )]
    pub program_data: Account<'info, ProgramData>,

    pub system_program: Program<'info, System>,
}

pub fn initialize(ctx: Context<Initialize>, issuer: Pubkey) -> Result<()> {
    ctx.accounts.config.set_inner(Config {
        admin: ctx.accounts.admin.key(),
        issuer,
        bump: ctx.bumps.config,
    });
    Ok(())
}
