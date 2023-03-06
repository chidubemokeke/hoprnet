//! Invalid format description

use alloc::string::String;
use core::fmt;

use crate::error;

/// The format description provided was not valid.
#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum InvalidFormatDescription {
    /// There was a bracket pair that was opened but not closed.
    #[non_exhaustive]
    UnclosedOpeningBracket {
        /// The zero-based index of the opening bracket.
        index: usize,
    },
    /// A component name is not valid.
    #[non_exhaustive]
    InvalidComponentName {
        /// The name of the invalid component name.
        name: String,
        /// The zero-based index the component name starts at.
        index: usize,
    },
    /// A modifier is not valid.
    #[non_exhaustive]
    InvalidModifier {
        /// The value of the invalid modifier.
        value: String,
        /// The zero-based index the modifier starts at.
        index: usize,
    },
    /// A component name is missing.
    #[non_exhaustive]
    MissingComponentName {
        /// The zero-based index where the component name should start.
        index: usize,
    },
}

impl From<InvalidFormatDescription> for crate::Error {
    fn from(original: InvalidFormatDescription) -> Self {
        Self::InvalidFormatDescription(original)
    }
}

impl TryFrom<crate::Error> for InvalidFormatDescription {
    type Error = error::DifferentVariant;

    fn try_from(err: crate::Error) -> Result<Self, Self::Error> {
        match err {
            crate::Error::InvalidFormatDescription(err) => Ok(err),
            _ => Err(error::DifferentVariant),
        }
    }
}

impl fmt::Display for InvalidFormatDescription {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        use InvalidFormatDescription::*;
        match self {
            UnclosedOpeningBracket { index } => {
                write!(f, "unclosed opening bracket at byte index {index}")
            }
            InvalidComponentName { name, index } => {
                write!(f, "invalid component name `{name}` at byte index {index}")
            }
            InvalidModifier { value, index } => {
                write!(f, "invalid modifier `{value}` at byte index {index}")
            }
            MissingComponentName { index } => {
                write!(f, "missing component name at byte index {index}")
            }
        }
    }
}

#[cfg(feature = "std")]
impl std::error::Error for InvalidFormatDescription {}
