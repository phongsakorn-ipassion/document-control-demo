# demo-live Specification

## Purpose
Define the current ACS-style live demo behavior implemented in this project so future changes can be proposed and validated with OpenSpec.

## Requirements

### Requirement: Frontend-only runtime
The system SHALL run as a static frontend application without server-side dependencies.

#### Scenario: Local file execution
- **WHEN** a presenter opens `index.html` in a modern browser
- **THEN** the application SHALL load without Docker or backend services
- **AND** core features SHALL be available using browser memory/local storage

### Requirement: Global dashboard modules
The system SHALL provide a global dashboard with site, activity, task, and document summary modules.

#### Scenario: Initial dashboard view
- **WHEN** the app starts in normal mode
- **THEN** the user SHALL see `My Sites`, `My Activities`, `My Tasks`, and `My Documents`
- **AND** a user switcher SHALL be available in the top bar

### Requirement: Site-first navigation
The system SHALL enforce site entry before accessing site applications.

#### Scenario: Navigation blocked before site selection
- **WHEN** a user attempts to open `Site Dashboard`, `Document Library`, `Wiki`, or `Project Lists` from global view
- **THEN** the system SHALL block navigation
- **AND** SHALL show a prompt to open a site first

#### Scenario: Navigation enabled after site entry
- **WHEN** a user opens a site from `My Sites`
- **THEN** site applications SHALL be available
- **AND** the page title SHALL switch to the active site name

### Requirement: Site creation
The system SHALL support creating collaboration sites in the demo runtime.

#### Scenario: Create new site
- **WHEN** a user submits valid site name and site id
- **THEN** the system SHALL create a site with visibility setting
- **AND** SHALL initialize folder structure `01`, `02`, `03`, `04`
- **AND** SHALL seed a welcome document in folder `01`

### Requirement: Document library operations
The system SHALL support basic document operations in site folders.

#### Scenario: Browse folders
- **WHEN** a user opens `Document Library`
- **THEN** the system SHALL show folder tree and folder contents
- **AND** folder labels SHALL map to the configured approval stages

#### Scenario: Upload documents
- **WHEN** a user uploads one or more files
- **THEN** files SHALL be created in the selected target folder
- **AND** content preview data SHALL be captured for text/image files where possible

#### Scenario: Create document
- **WHEN** a user creates a document from the create form
- **THEN** the document SHALL be created with owner, folder, and content metadata
- **AND** document list SHALL refresh immediately

#### Scenario: Preview and download
- **WHEN** a user clicks preview or download for a document
- **THEN** the system SHALL show an in-app preview modal
- **AND** SHALL provide browser download for document payload

### Requirement: Approval workflow transitions
The system SHALL support two-round review workflow transitions across folders.

#### Scenario: Start workflow from folder 01
- **GIVEN** a document is in folder `01`
- **WHEN** a user starts workflow and assigns a reviewer
- **THEN** the document SHALL move to folder `02`
- **AND** a task SHALL be created for the reviewer with metadata (message, due, priority)

#### Scenario: Start workflow from folder 02
- **GIVEN** a document is in folder `02`
- **WHEN** a user starts workflow and assigns a reviewer
- **THEN** the document SHALL move to folder `03`
- **AND** a second-round task SHALL be created

#### Scenario: Approve task
- **GIVEN** a reviewer has an active task
- **WHEN** the reviewer approves
- **THEN** round-1 approval SHALL mark the name with `[02-Passed]`
- **AND** round-2 approval SHALL mark `[Final-Approved]` and move the document to folder `04`

#### Scenario: Reject task
- **GIVEN** a reviewer has an active task
- **WHEN** the reviewer rejects
- **THEN** the document SHALL move back one stage (`02 -> 01`, `03 -> 02`)
- **AND** the task SHALL be removed from active tasks

### Requirement: Task-centric review actions
The system SHALL expose review actions through `My Tasks` for the assigned user.

#### Scenario: Task visibility by assignee
- **WHEN** a different demo user is selected
- **THEN** only tasks assigned to that user in the current site SHALL be shown

#### Scenario: Task actions
- **WHEN** an assignee uses task actions
- **THEN** preview, download, approve, and reject operations SHALL be available from task cards

### Requirement: Wiki collaboration
The system SHALL provide wiki listing, viewing, and editing for project knowledge.

#### Scenario: Wiki page lifecycle
- **WHEN** a user creates, edits, renames, or deletes a wiki page
- **THEN** the wiki list and current page state SHALL update immediately

#### Scenario: Rich content editing
- **WHEN** a user edits wiki content
- **THEN** the editor SHALL support basic rich-text commands and image insertion
- **AND** save SHALL persist rendered HTML in runtime state

### Requirement: Project list tracking
The system SHALL provide issue-style list tracking for project coordination.

#### Scenario: List management
- **WHEN** a user creates a new project list
- **THEN** the list SHALL appear in the side menu with item count

#### Scenario: Item management
- **WHEN** a user creates a new list item
- **THEN** the item SHALL be added to the selected list
- **AND** table columns SHALL include issue id, title, assignee, status, priority, due date, and comments

### Requirement: Public share mode
The system SHALL support public sharing for final approved documents.

#### Scenario: Share only from published folder
- **GIVEN** a document is not in folder `04`
- **WHEN** a user attempts public share
- **THEN** the system SHALL reject share creation with an error message

#### Scenario: Public access via share token
- **GIVEN** a document is in folder `04`
- **WHEN** a user creates public share
- **THEN** the system SHALL create a tokenized URL
- **AND** open a no-login public view with preview and download actions
- **AND** persist share mapping in browser local storage
