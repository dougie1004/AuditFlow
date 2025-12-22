

export type AuditAreaCode = 
  | 'FSC' | 'TRE' | 'EXP' | 'OTC' | 'STP' | 'FXA' | 'INV' | 'HRE' | 'SEC';

export interface AuditArea {
  code: AuditAreaCode;
  name: string;
  description: string;
  totalScenarios: number;
  violationCount: number;
}

export interface Scenario {
  id: string;
  areaCode: AuditAreaCode;
  title: string;
  status: 'Pass' | 'Fail';
  description: string; // Brief description
  detailedDescription: string; // Detailed explanation for auditor
  timestamp: string;
  type: 'Structured' | 'Unstructured';
  evidenceUrl: string; // URL to the proof document
  isNew: boolean;
  risk: 'High' | 'Medium' | 'Low';
  violationId?: string; // Link to specific violation detail
}

export interface ViolationDetail {
  id: string; 
  areaCode: AuditAreaCode;
  riskLevel: 'High' | 'Medium' | 'Low';
  controlPoint: string;
  violationType: string;
  transactionInfo: {
    id: string;
    amount?: string;
    date: string;
    entity: string;
  };
  aiAnalysis: string; 
  recommendation: string;
  evidenceDocumentUrl?: string; 
  evidenceType: 'Contract' | 'Approval Email' | 'Log File' | 'Policy Doc';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isJson?: boolean; // New property to indicate if text content is JSON
}

export type AnomalyType = '자택 근처 사용' | '주말/심야 사용' | '한도 초과' | '쪼개기 결제 의심' | '유흥업소 사용 의심' | '사적 사용 의심' | null;

export interface CorpCardTransaction {
  id: string;
  employee: { 
    name: string; 
    id: string; 
    homeAddress: string; 
    department: string; 
    homeLocation: { lat: number; lng: number; };
  };
  merchant: string;
  location: { lat: number; lng: number, name: string; address: string; };
  amount: number;
  timestamp: string;
  category: string;
  anomaly: AnomalyType;
}

export interface ForecastDataPoint {
  week: string;
  sales?: number;
  demand?: number;
  production?: number;
  inventory?: number;
}


export interface MockDocument {
  id: string;
  title: string;
  category: string;
  content: string;
}

export interface MockUploadFile {
  id: string;
  name: string;
  type: 'Excel' | 'CSV' | 'PDF' | 'LOG';
  size: string;
  category: AuditAreaCode;
  content: string; // Made content mandatory
}

// New Types for Audit Management
export type AuditPhase = 'Planning' | 'Fieldwork' | 'Reporting' | 'FollowUp';

export interface AuditTask {
  id: string;
  phase: AuditPhase;
  date: string;
  content: string;
  completed: boolean;
  assignee?: string;
}
