use anchor_lang::prelude::*;

use crate::error::PassportError;
use crate::events::{BountyPaid, CredentialIssued};
use crate::skill;
use crate::state::{Bounty, Config, Credential, CONFIG_SEED, CREDENTIAL_SEED};

#[derive(Accounts)]
#[instruction(skill_id: String, skill_hash: [u8; 32])]
pub struct IssueCredential<'info> {
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = issuer @ PassportError::NotIssuer,
    )]
    pub config: Account<'info, Config>,

    // `init` is what makes a credential one-per-learner-per-skill.
    #[account(
        init,
        payer = payer,
        space = 8 + Credential::INIT_SPACE,
        seeds = [CREDENTIAL_SEED, learner.key().as_ref(), skill_hash.as_ref()],
        bump,
    )]
    pub credential: Account<'info, Credential>,

    /// CHECK: any wallet; it only names the credential and receives bounty
    /// payouts, and the owner check keeps program accounts out.
    #[account(mut, owner = System::id() @ PassportError::LearnerNotWallet)]
    pub learner: UncheckedAccount<'info>,

    pub issuer: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn issue_credential<'info>(
    ctx: Context<'_, '_, 'info, 'info, IssueCredential<'info>>,
    skill_id: String,
    skill_hash: [u8; 32],
    replay_hash: [u8; 32],
    score: u16,
) -> Result<()> {
    skill::validate(&skill_id, &skill_hash)?;
    let learner = ctx.accounts.learner.key();

    ctx.accounts.credential.set_inner(Credential {
        learner,
        skill_hash,
        skill_id: skill_id.clone(),
        replay_hash,
        score,
        issued_at: Clock::get()?.unix_timestamp,
        issuer: ctx.accounts.issuer.key(),
        bump: ctx.bumps.credential,
    });

    for info in ctx.remaining_accounts {
        pay_bounty(info, &ctx.accounts.learner, &skill_hash)?;
    }

    emit!(CredentialIssued {
        learner,
        skill_id,
        replay_hash,
        score,
    });
    Ok(())
}

// Only this program can write an account that carries the Bounty
// discriminator, and it only does so at the bounty PDA, so a successful
// `Account::try_from` already proves the account is a real bounty.
fn pay_bounty<'info>(
    info: &'info AccountInfo<'info>,
    learner: &UncheckedAccount<'info>,
    skill_hash: &[u8; 32],
) -> Result<()> {
    require!(info.is_writable, PassportError::BountyNotWritable);
    let mut bounty = Account::<Bounty>::try_from(info)?;

    require!(bounty.skill_hash == *skill_hash, PassportError::BountySkillMismatch);
    require!(bounty.claimed_by.is_none(), PassportError::BountyAlreadyClaimed);
    if let Some(reserved_for) = bounty.learner {
        require_keys_eq!(reserved_for, learner.key(), PassportError::BountyLearnerMismatch);
    }

    bounty.sub_lamports(bounty.amount)?;
    learner.add_lamports(bounty.amount)?;
    bounty.claimed_by = Some(learner.key());
    // Persist now, so the same bounty listed twice reads as claimed the second time.
    bounty.exit(&crate::ID)?;

    emit!(BountyPaid {
        bounty: info.key(),
        learner: learner.key(),
        amount: bounty.amount,
    });
    Ok(())
}
