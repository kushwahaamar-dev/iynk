use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

use crate::error::PassportError;

pub const MAX_SKILL_ID_LEN: usize = 64;

/// A skill id is 1 to 64 bytes of printable ASCII without spaces
/// (for example `drone:quad5:safety`), and `skill_hash` must be its sha256.
pub fn validate(skill_id: &str, skill_hash: &[u8; 32]) -> Result<()> {
    require!(
        !skill_id.is_empty() && skill_id.len() <= MAX_SKILL_ID_LEN,
        PassportError::SkillIdLength
    );
    require!(
        skill_id.bytes().all(|b| b.is_ascii_graphic()),
        PassportError::SkillIdCharset
    );
    require!(
        hash(skill_id.as_bytes()).to_bytes() == *skill_hash,
        PassportError::SkillHashMismatch
    );
    Ok(())
}
