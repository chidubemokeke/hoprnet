#![allow(non_snake_case, non_camel_case_types, non_upper_case_globals, clashing_extern_declarations, clippy::all)]
#[cfg(feature = "Win32_Data_Xml_MsXml")]
pub mod MsXml;
#[cfg(feature = "Win32_Data_Xml_XmlLite")]
pub mod XmlLite;
#[cfg(feature = "implement")]
::core::include!("impl.rs");
