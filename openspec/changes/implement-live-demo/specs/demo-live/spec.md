## ADDED Requirements

### Requirement: Deterministic demo reset
The system SHALL provide a deterministic reset path to prepare for repeated live presentations.

#### Scenario: Reset before demo
- **WHEN** presenter triggers reset routine
- **THEN** runtime state SHALL return to seeded default users/sites/documents/wiki/lists
- **AND** stale public-share mappings SHALL be cleared from localStorage

### Requirement: Demo preflight verification
The system SHALL support a preflight verification checklist before live presentation.

#### Scenario: Preflight pass
- **WHEN** presenter runs the preflight checklist
- **THEN** checklist SHALL verify site entry, upload/create document, workflow handoff, task approval, and public-share open
- **AND** each check SHALL produce pass/fail output for quick decision making

### Requirement: Guided live-demo runbook
The system SHALL include a runbook that maps user actions to expected system outcomes for each demo step.

#### Scenario: Runbook step validation
- **WHEN** presenter follows runbook steps in order
- **THEN** each step SHALL define expected UI state and success criteria
- **AND** deviations SHALL include corrective actions

## MODIFIED Requirements

### Requirement: Public share mode
The system SHALL support public sharing for final approved documents with explicit token lifecycle behavior.

#### Scenario: Share token validity
- **GIVEN** a public share token exists
- **WHEN** viewer opens the share URL
- **THEN** system SHALL render public preview/download view
- **AND** if token is missing or cleared, SHALL render a clear "shared document not found" state

#### Scenario: Share creation guardrail
- **GIVEN** a document is not in folder `04`
- **WHEN** user attempts to create a public link
- **THEN** system SHALL reject with explicit folder constraint message

### Requirement: Approval workflow transitions
The system SHALL enforce visible and auditable transitions for every review action.

#### Scenario: Transition audit visibility
- **WHEN** workflow starts, approves, or rejects
- **THEN** activity feed SHALL include one entry per transition
- **AND** resulting folder/stage SHALL be immediately visible in document or task context
