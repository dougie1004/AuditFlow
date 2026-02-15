pub mod ledger_builder;
pub mod card_builder;
use crate::models::EntityEvent;

/// [EventBuilder Trait]
/// 모든 Parser는 이 Trait을 구현하여, 원본 데이터 포맷에 상관없이
/// 표준화된 EntityEvent를 생성해야 한다.
pub trait EventBuilder {
    fn build_events(&self) -> Vec<EntityEvent>;
}

/// [Ingestion Coordinator]
/// 다양한 EventBuilder 구현체로부터 이벤트를 수집하여 DB에 저장한다.
pub struct IngestionService;

impl IngestionService {
    pub fn ingest<T: EventBuilder>(builder: T) -> Vec<EntityEvent> {
        let events = builder.build_events();
        // 실제 DB 저장 로직은 command나 service layer에서 수행
        // 여기서는 표준화된 이벤트 벡터를 반환하는 역할만 수행
        events
    }
}
