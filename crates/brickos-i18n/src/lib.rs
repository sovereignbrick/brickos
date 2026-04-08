use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

/// Translation status for a single locale.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocaleStatus {
    pub total_keys: usize,
    pub translated: usize,
}

/// Overall i18n status for an app, returned by GET /api/v1/i18n/status.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct I18nStatus {
    pub app_key: String,
    pub locales: BTreeMap<String, LocaleStatus>,
    pub missing_keys: BTreeMap<String, Vec<String>>,
}

/// Flatten a nested JSON object into dot-separated keys.
/// e.g., `{"auth": {"login": "Log in"}}` -> `["auth.login"]`
pub fn flatten_keys(value: &serde_json::Value, prefix: &str) -> BTreeSet<String> {
    let mut keys = BTreeSet::new();
    if let serde_json::Value::Object(map) = value {
        for (k, v) in map {
            let full_key = if prefix.is_empty() {
                k.clone()
            } else {
                format!("{prefix}.{k}")
            };
            if v.is_object() {
                keys.extend(flatten_keys(v, &full_key));
            } else {
                keys.insert(full_key);
            }
        }
    }
    keys
}

/// Compare a reference locale (typically "en") against target locales
/// and return the [`I18nStatus`].
pub fn compute_status(
    app_key: &str,
    reference_json: &serde_json::Value,
    translations: &BTreeMap<String, serde_json::Value>,
) -> I18nStatus {
    let ref_keys = flatten_keys(reference_json, "");
    let mut locales = BTreeMap::new();
    let mut missing_keys = BTreeMap::new();

    // Reference locale (en) is always 100%
    locales.insert(
        "en".to_string(),
        LocaleStatus {
            total_keys: ref_keys.len(),
            translated: ref_keys.len(),
        },
    );

    for (locale, json) in translations {
        let locale_keys = flatten_keys(json, "");
        let missing: Vec<String> = ref_keys.difference(&locale_keys).cloned().collect();
        locales.insert(
            locale.clone(),
            LocaleStatus {
                total_keys: ref_keys.len(),
                translated: ref_keys.len() - missing.len(),
            },
        );
        if !missing.is_empty() {
            missing_keys.insert(locale.clone(), missing);
        }
    }

    I18nStatus {
        app_key: app_key.to_string(),
        locales,
        missing_keys,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn flatten_keys_nested() {
        let value = json!({
            "common": {
                "save": "Save",
                "cancel": "Cancel"
            },
            "auth": {
                "login": "Log in"
            }
        });
        let keys = flatten_keys(&value, "");
        assert_eq!(keys.len(), 3);
        assert!(keys.contains("common.save"));
        assert!(keys.contains("common.cancel"));
        assert!(keys.contains("auth.login"));
    }

    #[test]
    fn flatten_keys_empty_object() {
        let value = json!({});
        let keys = flatten_keys(&value, "");
        assert!(keys.is_empty());
    }

    #[test]
    fn flatten_keys_non_object() {
        let value = json!("just a string");
        let keys = flatten_keys(&value, "");
        assert!(keys.is_empty());
    }

    #[test]
    fn compute_status_complete_translation() {
        let en = json!({"common": {"save": "Save", "cancel": "Cancel"}});
        let de = json!({"common": {"save": "Speichern", "cancel": "Abbrechen"}});
        let mut translations = BTreeMap::new();
        translations.insert("de".to_string(), de);

        let status = compute_status("sovereign-health", &en, &translations);

        assert_eq!(status.app_key, "sovereign-health");
        assert_eq!(status.locales["en"].total_keys, 2);
        assert_eq!(status.locales["en"].translated, 2);
        assert_eq!(status.locales["de"].total_keys, 2);
        assert_eq!(status.locales["de"].translated, 2);
        assert!(status.missing_keys.is_empty());
    }

    #[test]
    fn compute_status_missing_key() {
        let en = json!({
            "common": {"save": "Save", "cancel": "Cancel"},
            "auth": {"login": "Log in"}
        });
        let de = json!({
            "common": {"save": "Speichern", "cancel": "Abbrechen"}
        });
        let mut translations = BTreeMap::new();
        translations.insert("de".to_string(), de);

        let status = compute_status("sovereign-health", &en, &translations);

        assert_eq!(status.locales["en"].total_keys, 3);
        assert_eq!(status.locales["de"].translated, 2);
        assert_eq!(status.missing_keys["de"], vec!["auth.login".to_string()]);
    }

    #[test]
    fn compute_status_empty_translations() {
        let en = json!({"key": "value"});
        let translations = BTreeMap::new();

        let status = compute_status("test-app", &en, &translations);

        assert_eq!(status.locales.len(), 1);
        assert_eq!(status.locales["en"].total_keys, 1);
        assert!(status.missing_keys.is_empty());
    }
}
