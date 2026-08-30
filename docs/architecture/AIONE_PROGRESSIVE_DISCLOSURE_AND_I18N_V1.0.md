# AIONE Progressive Disclosure & Internationalization Foundation V1.0

Status: CURRENT
Effective date: 2026-08-30
Applies to: 美和AIONE一体化工作平台（AIONE）

## 1. Purpose

This standard defines two platform-level rules for AIONE:

1. Progressive Disclosure: keep the primary interface light, and expose lower-frequency or contextual capabilities through appropriate expansion patterns.
2. Internationalization from the foundation stage: preserve a simple Chinese-first experience now while ensuring the platform can support Chinese, Japanese, and English without later structural rework.

These are platform rules, not page-specific exceptions.

## 2. Progressive Disclosure Rule

AIONE should not place every capability directly on the primary surface.

Default decision order:

- High-frequency and mission-critical actions: show directly.
- Low-frequency but important actions: place in an expandable menu.
- Context-dependent actions: place in the current object / company / organization / user context menu.
- Configuration requiring explanation or multiple fields: use Drawer or Dialog.
- Very low-frequency system configuration: place in Settings.

Preferred shared interaction patterns:

- ContextMenu
- MoreMenu
- Dropdown
- Popover
- Drawer
- Dialog

Do not create page-specific interaction patterns when a shared pattern can solve the problem.

## 3. Language Entry Rule

AIONE reserves a visible language entry from the early platform stage.

Initial language targets:

- 中文
- 日本語
- English

Current default display language: Chinese.

Preferred placement: company / organization context area in the Header or its expansion menu. The language entry should be visible and easy to find without occupying a primary business-navigation slot.

Language switching must not change:

- route identity
- object identity
- permission identity
- tenant identity
- business data identity

The same business object is displayed through different language labels.

## 4. Machine Identity vs Human Labels

Machine identity and human-facing text must be separated.

Example:

```text
code: PRODUCT_HOME
zh-CN: 商品之家
ja-JP: 商品ホーム
en-US: Product Home
```

Rules:

- Code / UUID is the stable machine identity.
- Chinese, Japanese, and English are display labels.
- Business logic must not depend on translated labels.
- English display text is not automatically the same thing as internal code.

## 5. UI Internationalization

System UI text should gradually move to a unified i18n resource layer rather than page-level hardcoded Chinese strings.

Target scope includes:

- Header
- Sidebar
- Tabs
- buttons
- forms
- filters
- search
- dialogs
- drawers
- toasts
- empty states
- error states
- settings
- status labels
- permission labels

Recommended resource structure:

```text
i18n/
  locales/
    zh-CN/
    ja-JP/
    en-US/
  terminology/
  formatters/
  locale-context/
```

Shared services should provide capabilities such as:

```text
t()
formatDate()
formatCurrency()
formatNumber()
```

## 6. Business Terminology Registry

AIONE should maintain one platform-level terminology source so the same business concept is not translated differently on different pages.

Examples:

- 商品之家
- 商品中心
- 商品机会
- 工作之家
- 负责人
- 状态

A business term should map to one stable code and approved labels per locale.

## 7. Locale Context

AIONE should preserve a platform-level Locale Context that can resolve at minimum:

```text
tenant
organization
user
language
locale
timezone
currency
country
market
```

Recommended resolution order for display language:

```text
user preferred language
→ organization default language
→ tenant default language
```

Do not merge language, country, market, currency, timezone, and legal entity into one concept.

## 8. Data and Status Rules

Do not store translated UI labels as system state identifiers.

Bad:

```text
status = 已完成
```

Preferred:

```text
status = COMPLETED
```

Display labels:

```text
zh-CN: 已完成
ja-JP: 完了
en-US: Completed
```

The same rule applies to type, role, permission, workflow state, channel type, product type, and other machine-readable enums.

## 9. Google Drive Language Rule

Google Shared Drive keeps one physical directory hierarchy and one primary directory language.

Current primary directory language: Chinese.

Do not duplicate the whole hierarchy into separate Chinese / Japanese / English folder trees.

Directory naming follows the approved AIONE directory rule, for example:

```text
06_商品之家
06_01_商品中心
06_02_分类中心
```

The Chinese business name in Drive must remain consistent with the official AIONE Chinese business name.

AIONE may display translated labels while mapping to the same Drive node.

## 10. Multilingual Content Rule

Directories remain single-language, but formal content may have multiple language variants.

Example:

```text
Document Group: MIWA_GROUP_PROFILE
- zh-CN version
- ja-JP version
- en-US version
```

Recommended metadata:

```text
canonical_language
available_languages
translation_status
translation_source
translation_version
review_status
```

AI translation may assist production, but an AI translation is not automatically a formally approved version for high-risk or external-facing material.

## 11. Architecture Guardrails

AIONE should progressively add automated checks that discourage or block:

- duplicated language-specific page code
- page-level language frameworks
- direct dependence on translated labels in business logic
- machine states stored as Chinese/Japanese/English labels
- inconsistent translation of the same business term
- uncontrolled UI hardcoding when shared i18n resources exist
- duplicated Drive directory trees by language

## 12. Current Implementation Principle

AIONE is currently Chinese-first, but the codebase should be internationalization-ready from the beginning.

The implementation strategy is:

```text
visible language entry now
+ Chinese default now
+ i18n architecture now
+ terminology and locale contracts now
+ multilingual content added gradually
```

This avoids premature complexity while preventing expensive future refactoring.

## 13. Governance

This document is a platform architecture standard and should be treated as CURRENT until superseded by a formally approved newer version or ADR.

Page implementations should not override this rule locally.
