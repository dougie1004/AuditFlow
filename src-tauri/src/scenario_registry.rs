use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Read;
use std::path::Path;
use crate::models::{ScenarioDefinition, ParameterDefinition, OverrideValue};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MockScenarioConfig {
    pub id: String,
    pub name: String,
    pub domain: String,
    pub version: String,
    pub enabled: bool,
    pub parameters: Vec<ParameterDefinition>,
}

pub struct MockRegistry {
    scenarios: HashMap<String, MockScenarioConfig>,
    overrides: HashMap<String, String>, // Key format: "project_id:scenario_id:key" -> value
}

impl MockRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            scenarios: HashMap::new(),
            overrides: HashMap::new(),
        };
        let _ = registry.load_from_file();
        registry
    }

    fn load_from_file(&mut self) -> Result<(), String> {
        let path = Path::new("registry_mock.json");
        if !path.exists() {
            return Err("registry_mock.json not found".to_string());
        }

        let mut file = File::open(path).map_err(|e| e.to_string())?;
        let mut content = String::new();
        file.read_to_string(&mut content).map_err(|e| e.to_string())?;

        let configs: Vec<MockScenarioConfig> = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        for config in configs {
            self.scenarios.insert(config.id.clone(), config);
        }

        Ok(())
    }

    pub fn get_scenario(&self, id: &str) -> Option<&MockScenarioConfig> {
        self.scenarios.get(id)
    }

    pub fn get_all_scenarios(&self) -> Vec<&MockScenarioConfig> {
        self.scenarios.values().collect()
    }

    pub fn set_override(&mut self, project_id: &str, scenario_id: &str, key: &str, value: &str) {
        let override_key = format!("{}:{}:{}", project_id, scenario_id, key);
        self.overrides.insert(override_key, value.to_string());
    }

    pub fn get_override(&self, project_id: &str, scenario_id: &str, key: &str) -> Option<&String> {
        let override_key = format!("{}:{}:{}", project_id, scenario_id, key);
        self.overrides.get(&override_key)
    }
}
