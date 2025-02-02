use crate::errors::{GeneralError::InvalidInput, GeneralError::ParseError, Result};
use crate::traits::{BinarySerializable, ToHex};
use ethnum::{u256, AsU256};
use std::ops::{Add, Sub};
use std::string::ToString;

/// Represents an Ethereum address
#[derive(Clone, Copy, Eq, PartialEq, Debug)]
#[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen)]
pub struct Address {
    addr: [u8; Self::SIZE],
}

#[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen)]
impl Address {
    #[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen(constructor))]
    pub fn new(bytes: &[u8]) -> Self {
        assert_eq!(bytes.len(), Self::SIZE, "invalid length");
        let mut ret = Address {
            addr: [0u8; Self::SIZE],
        };
        ret.addr.copy_from_slice(bytes);
        ret
    }

    // impl std::string::ToString {
    pub fn to_string(&self) -> String {
        self.to_hex()
    }
    // }
}

impl BinarySerializable<'_> for Address {
    const SIZE: usize = 20;

    fn deserialize(data: &[u8]) -> Result<Self> {
        if data.len() == Self::SIZE {
            let mut ret = Address {
                addr: [0u8; Self::SIZE],
            };
            ret.addr.copy_from_slice(&data);
            Ok(ret)
        } else {
            Err(ParseError)
        }
    }

    fn serialize(&self) -> Box<[u8]> {
        self.addr.into()
    }
}

impl Address {
    // impl std::str::FromStr for Address {
    pub fn from_str(value: &str) -> Result<Address> {
        Self::deserialize(&hex::decode(value).map_err(|_| ParseError)?)
    }
    // }
}

/// Represents a type of the balance: native or HOPR tokens.
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
#[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen)]
pub enum BalanceType {
    Native,
    HOPR,
}

/// Represents balance of some coin or token.
#[derive(Clone, Debug, PartialEq)]
#[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen)]
pub struct Balance {
    value: u256,
    balance_type: BalanceType,
}

#[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen)]
impl Balance {
    #[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen(constructor))]
    pub fn from_str(value: &str, balance_type: BalanceType) -> Self {
        Balance {
            value: u256::from_str_radix(value, 10).unwrap(),
            balance_type,
        }
    }

    /// Retrieves the type (symbol) of the balance
    pub fn balance_type(&self) -> BalanceType {
        self.balance_type
    }

    // impl ToHex for Balance {
    pub fn to_hex(&self) -> String {
        hex::encode(self.value().to_be_bytes())
    }
    // }

    // impl std::string::ToString for Balance {
    pub fn to_string(&self) -> String {
        self.value.to_string()
    }
    // }

    /// Serializes just the value of the balance (not the symbol)
    pub fn serialize_value(&self) -> Box<[u8]> {
        self.value().to_be_bytes().into()
    }

    // impl PartialOrd for Balance {
    // NOTE: That these implementation rather panic to avoid comparison of different tokens
    // If PartialOrd was implemented, it would silently allow comparison of different tokens.

    pub fn lt(&self, other: &Balance) -> bool {
        assert_eq!(self.balance_type(), other.balance_type());
        self.value().lt(other.value())
    }

    pub fn lte(&self, other: &Balance) -> bool {
        assert_eq!(self.balance_type(), other.balance_type());
        self.value().lt(other.value()) || self.value().eq(other.value())
    }

    pub fn gt(&self, other: &Balance) -> bool {
        assert_eq!(self.balance_type(), other.balance_type());
        self.value().gt(other.value())
    }

    pub fn gte(&self, other: &Balance) -> bool {
        assert_eq!(self.balance_type(), other.balance_type());
        self.value().gt(other.value()) || self.value().eq(other.value())
    }

    // }

    pub fn add(&self, other: &Balance) -> Self {
        assert_eq!(self.balance_type(), other.balance_type());
        Balance {
            value: self.value().add(other.value()),
            balance_type: self.balance_type,
        }
    }

    pub fn iadd(&self, amount: u64) -> Self {
        Balance {
            value: self.value().add(amount.as_u256()),
            balance_type: self.balance_type,
        }
    }

    pub fn sub(&self, other: &Balance) -> Self {
        assert_eq!(self.balance_type(), other.balance_type());
        Balance {
            value: self.value().sub(other.value()),
            balance_type: self.balance_type,
        }
    }

    pub fn isub(&self, amount: u64) -> Self {
        Balance {
            value: self.value().sub(amount.as_u256()),
            balance_type: self.balance_type,
        }
    }
}

impl Balance {
    /// Size of the balance value is equal to U256 size (32 bytes)
    pub const SIZE: usize = U256::SIZE;

    pub fn new(value: u256, balance_type: BalanceType) -> Self {
        Balance { value, balance_type }
    }

    pub fn value(&self) -> &u256 {
        &self.value
    }

    pub fn deserialize(data: &[u8], balance_type: BalanceType) -> Result<Balance> {
        Ok(Balance {
            value: u256::from_be_bytes(data.try_into().map_err(|_| ParseError)?),
            balance_type,
        })
    }
}

/// Represents and Ethereum challenge.
#[derive(Clone, Eq, PartialEq, Debug)]
#[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen)]
pub struct EthereumChallenge {
    challenge: [u8; Self::SIZE],
}

#[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen)]
impl EthereumChallenge {
    #[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen(constructor))]
    pub fn new(data: &[u8]) -> Self {
        assert_eq!(data.len(), Self::SIZE);

        let mut ret = EthereumChallenge {
            challenge: [0u8; Self::SIZE],
        };
        ret.challenge.copy_from_slice(data);
        ret
    }
}

impl BinarySerializable<'_> for EthereumChallenge {
    const SIZE: usize = 20;

    fn deserialize(data: &[u8]) -> Result<Self> {
        if data.len() == Self::SIZE {
            Ok(EthereumChallenge::new(data))
        } else {
            Err(ParseError)
        }
    }

    fn serialize(&self) -> Box<[u8]> {
        self.challenge.into()
    }
}

/// Represents a snapshot in the blockchain
#[derive(Clone, Eq, PartialEq, Debug)]
#[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen(getter_with_clone))]
pub struct Snapshot {
    pub block_number: U256,
    pub transaction_index: U256,
    pub log_index: U256,
}

#[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen)]
impl Snapshot {
    #[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen(constructor))]
    pub fn new(block_number: U256, transaction_index: U256, log_index: U256) -> Self {
        Self {
            block_number,
            transaction_index,
            log_index,
        }
    }
}

impl BinarySerializable<'_> for Snapshot {
    const SIZE: usize = 3 * U256::SIZE;

    fn deserialize(data: &[u8]) -> Result<Self> {
        if data.len() == Self::SIZE {
            Ok(Self {
                block_number: U256::deserialize(&data[0..U256::SIZE])?,
                transaction_index: U256::deserialize(&data[U256::SIZE..2 * U256::SIZE])?,
                log_index: U256::deserialize(&data[2 * U256::SIZE..3 * U256::SIZE])?,
            })
        } else {
            Err(ParseError)
        }
    }

    fn serialize(&self) -> Box<[u8]> {
        let mut ret = Vec::<u8>::with_capacity(Self::SIZE);
        ret.extend_from_slice(&self.block_number.serialize());
        ret.extend_from_slice(&self.transaction_index.serialize());
        ret.extend_from_slice(&self.log_index.serialize());
        ret.into_boxed_slice()
    }
}

/// Represents the Ethereum's basic numeric type - unsigned 256-bit integer
#[derive(Clone, Eq, PartialEq, Ord, PartialOrd, Debug)]
#[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen)]
pub struct U256 {
    value: u256,
}

#[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen)]
impl U256 {
    #[cfg_attr(feature = "wasm", wasm_bindgen::prelude::wasm_bindgen(constructor))]
    pub fn new(value: &str) -> Self {
        U256 {
            value: u256::from_str_radix(value, 10).expect("invalid decimal number string"),
        }
    }
}

impl BinarySerializable<'_> for U256 {
    const SIZE: usize = 32;

    fn deserialize(data: &[u8]) -> Result<Self> {
        Ok(U256 {
            value: u256::from_be_bytes(data.try_into().map_err(|_| ParseError)?),
        })
    }

    fn serialize(&self) -> Box<[u8]> {
        self.value.to_be_bytes().into()
    }
}

impl From<u256> for U256 {
    fn from(value: u256) -> Self {
        U256 { value }
    }
}

impl From<u128> for U256 {
    fn from(value: u128) -> Self {
        U256 {
            value: u256::from(value),
        }
    }
}

impl From<u64> for U256 {
    fn from(value: u64) -> Self {
        U256 {
            value: u256::from(value),
        }
    }
}

impl From<u32> for U256 {
    fn from(value: u32) -> Self {
        U256 {
            value: u256::from(value),
        }
    }
}

impl U256 {
    pub fn value(&self) -> &u256 {
        &self.value
    }

    pub fn from_inverse_probability(inverse_prob: &u256) -> Result<U256> {
        let highest_prob = u256::MAX;
        if inverse_prob.gt(&u256::ZERO) {
            Ok(U256 {
                value: highest_prob / inverse_prob,
            })
        } else if inverse_prob.eq(&u256::ZERO) {
            Ok(U256 { value: highest_prob })
        } else {
            Err(InvalidInput)
        }
    }
}

/// Unit tests of pure Rust code
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn address_tests() {
        let addr_1 = Address::new(&[0u8; Address::SIZE]);
        let addr_2 = Address::deserialize(&addr_1.serialize()).unwrap();

        assert_eq!(addr_1, addr_2, "deserialized address does not match");
    }

    #[test]
    fn balance_tests() {
        let b_1 = Balance::from_str("10", BalanceType::HOPR);
        assert_eq!("10".to_string(), b_1.to_string(), "to_string failed");

        let b_2 = Balance::deserialize(&b_1.serialize_value(), BalanceType::HOPR).unwrap();
        assert_eq!(b_1, b_2, "deserialized balance does not match");

        let b3 = Balance::new(100_u32.into(), BalanceType::HOPR);
        let b4 = Balance::new(200_u32.into(), BalanceType::HOPR);

        assert_eq!(300_u32, b3.add(&b4).value().as_u32(), "add test failed");
        assert_eq!(100_u32, b4.sub(&b3).value().as_u32(), "sub test failed");

        assert!(b3.lt(&b4) && b4.gt(&b3), "lte or lt test failed");
        assert!(b3.lte(&b3) && b4.gte(&b4), "gte or gt test failed");

        //assert!(Balance::new(100_u32.into()).lte(), "lte or lte test failed")
    }

    #[test]
    fn eth_challenge_tests() {
        let e_1 = EthereumChallenge::new(&[0u8; EthereumChallenge::SIZE]);
        let e_2 = EthereumChallenge::deserialize(&e_1.serialize()).unwrap();

        assert_eq!(e_1, e_2);
    }

    #[test]
    fn snapshot_tests() {
        let s1 = Snapshot::new(1234_u32.into(), 4567_u32.into(), 102030_u32.into());
        let s2 = Snapshot::deserialize(&s1.serialize()).unwrap();

        assert_eq!(s1, s2);
    }

    #[test]
    fn u256_tests() {
        let u_1 = U256::new("1234567899876543210");
        let u_2 = U256::deserialize(&u_1.serialize()).unwrap();

        assert_eq!(u_1, u_2);
    }
}

#[cfg(feature = "wasm")]
pub mod wasm {
    use crate::primitives::{Address, Balance, BalanceType, EthereumChallenge, Snapshot, U256};
    use crate::traits::{BinarySerializable, ToHex};
    use std::cmp::Ordering;
    use utils_misc::ok_or_jserr;
    use utils_misc::utils::wasm::JsResult;
    use wasm_bindgen::prelude::wasm_bindgen;

    #[wasm_bindgen]
    impl Address {
        #[wasm_bindgen(js_name = "deserialize")]
        pub fn deserialize_address(data: &[u8]) -> JsResult<Address> {
            ok_or_jserr!(Address::deserialize(data))
        }

        #[wasm_bindgen(js_name = "to_hex")]
        pub fn _to_hex(&self) -> String {
            self.to_hex()
        }

        #[wasm_bindgen(js_name = "serialize")]
        pub fn _serialize(&self) -> Box<[u8]> {
            self.serialize()
        }

        #[wasm_bindgen(js_name = "eq")]
        pub fn _eq(&self, other: &Address) -> bool {
            self.eq(other)
        }

        pub fn size() -> u32 {
            Self::SIZE as u32
        }
    }

    #[wasm_bindgen]
    impl Balance {
        #[wasm_bindgen(js_name = "deserialize")]
        pub fn _deserialize(data: &[u8], balance_type: BalanceType) -> JsResult<Balance> {
            ok_or_jserr!(Balance::deserialize(data, balance_type))
        }

        #[wasm_bindgen(js_name = "eq")]
        pub fn _eq(&self, other: &Balance) -> bool {
            self.eq(other)
        }
    }

    #[wasm_bindgen]
    impl EthereumChallenge {
        #[wasm_bindgen(js_name = "deserialize")]
        pub fn deserialize_challenge(data: &[u8]) -> JsResult<EthereumChallenge> {
            ok_or_jserr!(EthereumChallenge::deserialize(data))
        }

        #[wasm_bindgen(js_name = "serialize")]
        pub fn _serialize(&self) -> Box<[u8]> {
            self.serialize()
        }

        #[wasm_bindgen(js_name = "to_hex")]
        pub fn _to_hex(&self) -> String {
            self.to_hex()
        }

        #[wasm_bindgen(js_name = "eq")]
        pub fn _eq(&self, other: &EthereumChallenge) -> bool {
            self.eq(other)
        }

        pub fn size() -> u32 {
            Self::SIZE as u32
        }
    }

    #[wasm_bindgen]
    impl Snapshot {
        #[wasm_bindgen(js_name = "deserialize")]
        pub fn _deserialize(data: &[u8]) -> JsResult<Snapshot> {
            ok_or_jserr!(Snapshot::deserialize(data))
        }

        #[wasm_bindgen(js_name = "serialize")]
        pub fn _serialize(&self) -> Box<[u8]> {
            self.serialize()
        }

        pub fn size() -> u32 {
            Self::SIZE as u32
        }
    }

    #[wasm_bindgen]
    impl U256 {
        #[wasm_bindgen(js_name = "deserialize")]
        pub fn deserialize_u256(data: &[u8]) -> JsResult<U256> {
            ok_or_jserr!(U256::deserialize(data))
        }

        #[wasm_bindgen(js_name = "serialize")]
        pub fn _serialize(&self) -> Box<[u8]> {
            self.serialize()
        }

        #[wasm_bindgen(js_name = "to_hex")]
        pub fn _to_hex(&self) -> String {
            self.to_hex()
        }

        #[wasm_bindgen(js_name = "from_inverse_probability")]
        pub fn u256_from_inverse_probability(inverse_prob: &U256) -> JsResult<U256> {
            ok_or_jserr!(U256::from_inverse_probability(inverse_prob.value()))
        }

        #[wasm_bindgen(js_name = "eq")]
        pub fn _eq(&self, other: &U256) -> bool {
            self.eq(other)
        }

        #[wasm_bindgen(js_name = "cmp")]
        pub fn _cmp(&self, other: &U256) -> i32 {
            match self.cmp(&other) {
                Ordering::Less => -1,
                Ordering::Equal => 0,
                Ordering::Greater => 1,
            }
        }
    }
}
