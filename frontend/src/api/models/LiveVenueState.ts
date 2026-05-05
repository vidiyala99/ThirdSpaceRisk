/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ComplianceItem } from './ComplianceItem';
import type { InfrastructureItem } from './InfrastructureItem';
export type LiveVenueState = {
    venue_id: string;
    current_capacity: number;
    max_capacity: number;
    premium_impact: number;
    infrastructure: Array<InfrastructureItem>;
    compliance_queue: Array<ComplianceItem>;
};

