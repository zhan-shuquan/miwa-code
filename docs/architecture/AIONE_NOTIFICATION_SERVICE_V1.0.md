# AIONE Notification Service V1.0

Status: Proposed for CURRENT architecture

## 1. Positioning

Notification is an AIONE platform-level basic service, not a page-level feature.

It should sit alongside Authentication, Authorization, Workflow, Task, File, Search, Audit Log and AI Service as a shared capability used by all business domains.

Core principle:

> Business modules produce events. Notification Service decides who receives what, through which channel, when, and with what delivery state.

## 2. Scope

AIONE Notification Service should gradually provide:

- In-app notifications
- Web / App push notifications
- Email notifications
- User notification preferences
- Unread / read state
- Notification categories
- Object deep links
- Batch mark-as-read / archive
- Delivery logs
- Retry and deduplication
- Permission checks
- Auditability

Future channels may include Google Chat, Slack or other connectors where justified.

## 3. Event-driven model

Business modules should not directly implement independent notification logic.

Typical events include:

- Task assigned
- Task overdue
- Comment created
- User mentioned
- Object status changed
- Order status changed
- Inventory exception detected
- AI risk or exception detected

Recommended flow:

Business Event
→ Notification Service
→ Recipient / Preference / Permission Resolution
→ Channel Routing
→ Delivery Adapter
→ Delivery Result / Read State / Audit Log

## 4. Ownership boundary

Business domains own:

- Event meaning
- Business object context
- Business-specific recipient rules when required

Notification Service owns:

- Recipient resolution framework
- User notification preferences
- Channel selection
- Delivery orchestration
- Deduplication
- Retry
- Delivery state
- Read / unread state
- Notification history
- Audit trail

## 5. Engineering principle

AIONE should minimize custom infrastructure code.

Prefer mature platform capabilities for transport and infrastructure, such as Google Cloud Pub/Sub, Cloud Tasks, email providers and standard push mechanisms.

AIONE custom code should focus on business events, notification rules, preferences, object linkage and orchestration rather than rebuilding generic messaging infrastructure.

## 6. Architecture guardrail

Do not allow separate notification implementations to grow independently inside Selection, Sampling, Procurement, Design, Listing, Operations, Order, Inventory, Customer Service, Work Home, AI Home or other modules.

All new notification requirements should first ask:

> Can this be expressed as a business event and handled by the shared Notification Service?

If yes, reuse the shared service instead of adding page-level or module-level notification logic.

## 7. Current implementation status

This document defines Architecture Truth only.

It does not imply that the current `main` branch already implements the complete Notification Service.

Implementation should follow:

Product Freeze
→ Technical Design
→ Branch development
→ Automated checks
→ Preview validation
→ Review
→ Merge to main
