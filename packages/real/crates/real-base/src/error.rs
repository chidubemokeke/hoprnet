use thiserror::Error;

use wasm_bindgen::JsValue;
use crate::error::RealError::JsError;

#[derive(Error, Debug)]
pub enum RealError {
    #[error("javascript error: {0}")]
    JsError(String),

    #[error("general error: {0}")]
    GeneralError(String)
}

impl From<JsValue> for RealError {
    fn from(v: JsValue) -> Self {
        JsError(v.as_string().unwrap_or("unknown".into()))
    }
}

pub type Result<T> = core::result::Result<T, RealError>;
