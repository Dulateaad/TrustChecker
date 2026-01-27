export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RedFlag {
  type: string;
  severity: RiskLevel;
  evidence: string;
}

export interface UrlFlags {
  is_shortened: boolean;
  has_uncommon_tld: boolean;
  has_subdomains: boolean;
  has_ip_address: boolean;
  is_suspicious: boolean;
}

export interface BaseAnalysisResponse {
  risk_score: number;
  risk_level: RiskLevel;
  summary: string;
  red_flags: RedFlag[];
  recommended_actions: string[];
  safe_reply?: string;
  status?: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

export interface TextAnalysisResponse extends BaseAnalysisResponse {}

export interface LinkAnalysisResponse extends BaseAnalysisResponse {
  url_flags: UrlFlags;
  url_risk_score: number;
  normalized_url: string;
  host: string;
  scheme: string;
  tld: string;
}

export interface ImageAnalysisResponse extends BaseAnalysisResponse {
  extracted_text: string;
}

export interface DocumentAnalysisResponse extends BaseAnalysisResponse {
  extracted_text?: string;
  textract_mode?: string;
  jobId?: string;
}

export interface AudioAnalysisResponse extends BaseAnalysisResponse {
  transcript_text?: string;
  transcribe_job?: string;
  language_code?: string;
}

export type AnalysisResponse =
  | TextAnalysisResponse
  | LinkAnalysisResponse
  | ImageAnalysisResponse
  | DocumentAnalysisResponse
  | AudioAnalysisResponse;

export interface UploadUrlResponse {
  uploadUrl: string;
  s3Key: string;
}

export interface Pollable {
  transcribe_job?: string;
  jobId?: string;
}
