use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use crate::models::ParameterDefinition;
use crate::scenario_registry::MockRegistry;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ParameterValue {
    Int(i64),
    Float(f64),
    String(String),
    Boolean(bool),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScenarioContext {
    pub scenario_id: String,
    pub parameters: HashMap<String, ParameterValue>,
}

pub struct ContextBuilder;

impl ContextBuilder {
    /// build_context is strictly Read-Only. It reads from the MockRegistry and creates a ScenarioContext.
    pub fn build_context(registry: &MockRegistry, project_id: &str, scenario_id: &str) -> Option<ScenarioContext> {
        let config = registry.get_scenario(scenario_id)?;
        let mut parameters = HashMap::new();

        for param in &config.parameters {
            // Check if there is an override for this parameter
            let raw_value = if let Some(override_val) = registry.get_override(project_id, scenario_id, &param.key) {
                override_val.clone()
            } else {
                param.default_value.clone()
            };

            // Parse raw string value into the defined type
            let typed_value = match param.data_type.as_str() {
                "Int" => {
                    let parsed = raw_value.parse::<i64>().unwrap_or_else(|_| {
                        param.default_value.parse::<i64>().unwrap_or(0)
                    });
                    ParameterValue::Int(parsed)
                }
                "Float" => {
                    let parsed = raw_value.parse::<f64>().unwrap_or_else(|_| {
                        param.default_value.parse::<f64>().unwrap_or(0.0)
                    });
                    ParameterValue::Float(parsed)
                }
                "Boolean" => {
                    let parsed = raw_value.parse::<bool>().unwrap_or_else(|_| {
                        param.default_value.parse::<bool>().unwrap_or(false)
                    });
                    ParameterValue::Boolean(parsed)
                }
                _ => ParameterValue::String(raw_value), // Default fallback to String
            };

            parameters.insert(param.key.clone(), typed_value);
        }

        Some(ScenarioContext {
            scenario_id: scenario_id.to_string(),
            parameters,
        })
    }
}
