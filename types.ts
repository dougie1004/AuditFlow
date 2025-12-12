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
}