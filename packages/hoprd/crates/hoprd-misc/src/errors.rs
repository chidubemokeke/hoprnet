use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug, Serialize, Deserialize)]
pub enum HoprdConfigError {
    #[error("configuration file error: '{0}'")]
    FileError(String),

    #[error("serialization failed: '{0}'")]
    SerializationError(String),

    #[error("validation failed: '{0}'")]
    ValidationError(String),
}

pub type Result<T> = std::result::Result<T, HoprdConfigError>;
