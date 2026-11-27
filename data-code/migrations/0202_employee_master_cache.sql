-- Read-only relational projection of an authorized ERP cache. No employee master table.
CREATE OR REPLACE VIEW aione_employee_directory AS
SELECT e->>'memberId' AS id, e->>'name' AS display_name,
       e->>'employeeId' AS employee_id, e->>'status' AS status,
       e->>'prefix' AS item_prefix
FROM selection_workspace_config c,
LATERAL jsonb_array_elements(c.value->'employees') e
WHERE c.key='erp-employees' AND NULLIF(e->>'memberId','') IS NOT NULL;
