# AIONE Shared Component清单 V1.0 Draft

状态：待冻结

## 核心原则
平台共性统一实现；12之家只消费共享组件，不重复开发同类UI与交互。

## 组件目录
### Layout
AppShell, Header, GlobalNav, SecondaryNav, Sidebar, Main, Aside, Footer, PageContainer, SplitPane, StickyArea

### Navigation
NavTree, Breadcrumb, Tabs, Menu, ContextMenu, Pagination, Stepper, AnchorNav, HomeSwitcher, BusinessSwitcher

### Search / Scope
GlobalSearch, PageSearch, SearchBox, FilterBar, FilterChip, AdvancedFilter, SortSelector, ScopeSwitcher, ViewSwitcher, DateRangeSelector, SavedViewSelector, ResetFilter

### Selection / Bulk
RowCheckbox, SelectCurrentPage, SelectAllFiltered, DeselectAll, InvertSelection, SelectedCount, BulkSelectState, BulkActionBar

### Action / CRUD
PrimaryAction, SecondaryAction, IconAction, MoreActionMenu, ConfirmAction, DangerAction, UndoAction, RetryAction, CreateButton, EditButton, SaveButton, CancelButton, CopyButton, MoveButton, ArchiveButton, RestoreButton, DeleteButton, PermanentDeleteButton

### Data / Form
DataTable, DataGrid, List, Card, CardGrid, Tree, TreeTable, Badge, Chip, StatusBadge, Avatar, Progress, KPI, MetricCard, RankingList; TextField, TextArea, NumberField, CurrencyField, PercentageField, Select, MultiSelect, Autocomplete, Checkbox, Radio, Switch, DatePicker, DateTimePicker, DateRangePicker, UserPicker, ObjectPicker, TagPicker, FilePicker, RichTextEditor

### Object Foundation
ObjectHeader, ObjectTitle, ObjectStatus, ObjectOwner, ObjectTag, ObjectMetadata, ObjectActions, ObjectTabs, ObjectRelations, ObjectTimeline, ObjectHistory, ObjectActivity, ObjectAttachments, ObjectComments, ObjectMention, ObjectFollowers, ObjectFavorites, ObjectPermissions, ObjectAIInsight

### Interaction
LikeButton, FavoriteButton, FollowButton, ShareButton, CommentButton, CommentPanel, Reply, Mention, Reaction, ActivityFeed

### File / Import / Export / Publication
FileUploader, MultiFileUploader, FilePreview, FileList, FileCard, FileDownloader, FileRename, FileReplace, FileMove, FileCopy, FileVersion, FileShare, FileArchive, FileDelete; ImportWizard, ColumnMapping, ValidationPreview, ImportProgress, ImportResult; ExportMenu, ExportExcel, ExportCSV, ExportPDF, ExportZIP, ExportSelected, ExportFiltered, ExportAll; PrintButton, DownloadButton, PDFExport, ShareLink, PrintPreview, PublicationHeader, PublicationFooter, Cover, TableOfContents, PageNumber, VersionLabel

### Recycle Bin / History / Permission
RecycleBin, TrashList, RestoreButton, BulkRestore, PermanentDelete, BulkPermanentDelete, DeletedBy, DeletedAt, DeletedFrom, DeleteReason; Timeline, ActivityLog, AuditLog, StatusHistory, EditHistory, VersionHistory, ChangeDiff; PermissionViewer, PermissionEditor, RoleSelector, MemberPicker, ShareDialog, FieldPermission, ActionPermission, ObjectPermission

### Feedback / State / AI / Analytics / Workflow / Config / Integration
Toast, Snackbar, Dialog, ConfirmDialog, Alert, Banner, Tooltip, Popover; Loading, Skeleton, Empty, Error, NoResult, NoPermission, Offline, Disabled, Archived, Deleted; AIButton, AIDrawer, AIWorkspace, AIInsightPanel, AISummary, AISuggestion, AIProposal, AIExecuteConfirm, AITrace, AICost, AIResult, AIError; KPIGrid, ChartContainer, Ranking, Comparison, Trend, Anomaly, DrilldownLink; WorkflowStepper, StageIndicator, StatusTransition, Assignee, Priority, DueDate, Dependency, TaskList, Kanban, TimelineView, CalendarView, BatchConfirm, BatchTransition; ConfigTree, ConfigList, ConfigDetail, ConfigForm, EnableToggle, OrderEditor, MappingEditor, RuleEditor; ConnectionCard, ConnectionStatus, CredentialForm, PermissionScope, TestConnection, SyncButton, SyncStatus, FieldMapping, WebhookConfig, LogViewer, ErrorQueue, RetryQueue

## 第一批优先组件
AppShell, Header, Sidebar, NavTree, PageContainer, Breadcrumb, Tabs, SearchBox, FilterBar, ScopeSwitcher, ViewSwitcher, DataTable, BulkSelect, BulkActionBar, ObjectHeader, StatusBadge, OwnerSelector, ActionMenu, RecycleBin, AIDrawer

## 唯一性规则
同一种平台能力只允许一个 CURRENT 实现；变体通过 variant/size/density/state/scope/mode 解决，禁止 ProductSidebar / TalentSidebar 等重复组件。

## 修复层级
Token → Primitive → Shared Component → Business Component → Page Template → Page。能在上层修复的，不允许下层打补丁。
