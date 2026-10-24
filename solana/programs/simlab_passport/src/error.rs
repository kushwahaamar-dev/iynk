use anchor_lang::prelude::*;

#[error_code]
pub enum PassportError {
    #[msg("Only the program's upgrade authority can initialize the config")]
    NotUpgradeAuthority,
    #[msg("Only the config admin can do this")]
    NotAdmin,
    #[msg("Only the configured issuer can issue credentials")]
    NotIssuer,
    #[msg("Only the bounty's sponsor can cancel it")]
    NotSponsor,
    #[msg("skill_id must be 1 to 64 bytes")]
    SkillIdLength,
    #[msg("skill_id must be printable ASCII without spaces")]
    SkillIdCharset,
    #[msg("skill_hash must be sha256 of skill_id")]
    SkillHashMismatch,
    #[msg("The learner must be a wallet (an account owned by the System Program)")]
    LearnerNotWallet,
    #[msg("A bounty must hold at least the rent-exempt minimum of an empty account")]
    BountyTooSmall,
    #[msg("Bounty accounts must be passed as writable")]
    BountyNotWritable,
    #[msg("The bounty is for a different skill")]
    BountySkillMismatch,
    #[msg("The bounty is reserved for a different learner")]
    BountyLearnerMismatch,
    #[msg("The bounty has already been claimed")]
    BountyAlreadyClaimed,
}
