// BrickOS — Input validation for auth fields

pub fn validate_email(email: &str) -> bool {
    let parts: Vec<&str> = email.splitn(2, '@').collect();
    if parts.len() != 2 {
        return false;
    }
    let domain = parts[1];
    domain.contains('.')
}

pub fn validate_password(password: &str) -> Result<(), &'static str> {
    if password.len() < 8 {
        return Err("Password must be at least 8 characters");
    }
    if password.len() > 128 {
        return Err("Password must be at most 128 characters");
    }
    if !password.chars().any(|c| c.is_alphabetic()) {
        return Err("Password must contain at least one letter");
    }
    if !password.chars().any(|c| c.is_ascii_digit()) {
        return Err("Password must contain at least one digit");
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_email_passes() {
        assert!(validate_email("user@example.com"));
        assert!(validate_email("test.name@domain.co.uk"));
    }

    #[test]
    fn email_without_at_fails() {
        assert!(!validate_email("userexample.com"));
    }

    #[test]
    fn email_without_domain_dot_fails() {
        assert!(!validate_email("user@localhost"));
    }

    #[test]
    fn empty_email_fails() {
        assert!(!validate_email(""));
    }

    #[test]
    fn valid_password_passes() {
        assert!(validate_password("Secure1234").is_ok());
        assert!(validate_password("abcdefg1").is_ok());
    }

    #[test]
    fn short_password_fails() {
        assert!(validate_password("Short1").is_err());
        assert!(validate_password("Ab1").is_err());
    }

    #[test]
    fn empty_password_fails() {
        assert!(validate_password("").is_err());
    }
}
