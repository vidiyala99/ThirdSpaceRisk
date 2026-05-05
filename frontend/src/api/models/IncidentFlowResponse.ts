/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ActionItem } from './ActionItem';
import type { AgentExecutionStep } from './AgentExecutionStep';
import type { Incident } from './Incident';
import type { RiskSignal } from './RiskSignal';
import type { TimelineEvent } from './TimelineEvent';
import type { UnderwritingMemo } from './UnderwritingMemo';
export type IncidentFlowResponse = {
    incident: Incident;
    risk_signal: RiskSignal;
    action_plan: Array<ActionItem>;
    claims_timeline: Array<TimelineEvent>;
    underwriting_memo: UnderwritingMemo;
    execution_trace?: Array<AgentExecutionStep>;
};

