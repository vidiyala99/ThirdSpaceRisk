/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Citation } from './Citation';
export type RiskSignal = {
    type: string;
    severity: string;
    confidence: number;
    explanation: string;
    review_status: string;
    citations: Array<Citation>;
    premium_impact_estimate?: number;
    liability_score?: number;
};

