# lib/list-constants.ts
lines:5 exports:MIN_LIST_QUESTIONS,REQUIRED_CONFIRMATIONS
---
// A list must reach this many questions before it can be submitted for peer
// review, and needs this many distinct non-owner approvals before its owner
// can start it as a live contest.
export const MIN_LIST_QUESTIONS = 20;
export const REQUIRED_CONFIRMATIONS = 3;
