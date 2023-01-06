use blake2::Blake2s256;
use hkdf::SimpleHkdf;
use crate::errors::Result;
use crate::errors::CryptoError::{InvalidInputSize, InvalidParameterSize};

// General constants
pub const AES_BLOCK_SIZE: usize = 16;
pub const AES_KEY_SIZE: usize = 16;

/// Commitment specific
pub const HASH_KEY_COMMITMENT_SEED: &str = "HASH_KEY_COMMITMENT_SEED";
pub const HASH_KEY_HMAC: &str = "HASH_KEY_HMAC";
pub const HASH_KEY_PRG: &str = "HASH_KEY_PRG";
pub const HASH_KEY_PRP: &str = "HASH_KEY_PRP";
pub const HASH_KEY_PACKET_TAG: &str = "HASH_KEY_PACKET_TAG";

pub const SECRET_KEY_LENGTH: usize = 32;

/// PRP specific
pub const PRP_INTERMEDIATE_KEY_LENGTH: usize = 32;
pub const PRP_INTERMEDIATE_IV_LENGTH: usize = 16;
pub const PRP_KEY_LENGTH: usize = 4 * PRP_INTERMEDIATE_KEY_LENGTH;
pub const PRP_IV_LENGTH: usize = 4 * PRP_INTERMEDIATE_IV_LENGTH;

// The minimum input length must be at least size of the key, which is XORed with plaintext/ciphertext
pub const PRP_MIN_LENGTH: usize = PRP_INTERMEDIATE_KEY_LENGTH;

/// PRG specific
pub const PRG_KEY_LENGTH: usize = AES_KEY_SIZE;
pub const PRG_COUNTER_LENGTH: usize = 4;
pub const PRG_IV_LENGTH: usize = AES_BLOCK_SIZE - PRG_COUNTER_LENGTH;

pub const PACKET_TAG_LENGTH: usize = 16;

pub fn generate_key_iv(secret: &[u8], info: &[u8], key: &mut [u8], iv: &mut [u8]) -> Result<()> {
    if secret.len() != SECRET_KEY_LENGTH {
        return Err(InvalidParameterSize{name: "secret".into(), expected: SECRET_KEY_LENGTH})
    }

    let hkdf = SimpleHkdf::<Blake2s256>::from_prk(secret)
        .map_err(|_| InvalidParameterSize{name: "secret".into(), expected: SECRET_KEY_LENGTH})?;

    let mut out = vec![0u8; key.len() + iv.len()];
    hkdf.expand(info, &mut out)
        .map_err(|_| InvalidInputSize)?;

    let (v_key, v_iv) = out.split_at(key.len());
    key.copy_from_slice(v_key);
    iv.copy_from_slice(v_iv);

    Ok(())
}