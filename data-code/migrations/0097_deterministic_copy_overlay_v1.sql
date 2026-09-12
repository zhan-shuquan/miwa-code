BEGIN;

UPDATE public.design_templates
SET layout_spec = COALESCE(layout_spec, '{}'::jsonb) || jsonb_build_object(
      'copyOverlay',
      jsonb_build_object(
        'rendererVersion', 'v1',
        'locale', 'ja-JP',
        'fontKey', 'noto-sans-cjk-jp',
        'slots', jsonb_build_object(
          'eyebrow', jsonb_build_object(
            'x', 90, 'y', 95, 'width', 820, 'height', 80,
            'pointSize', 34, 'fontKey', 'noto-sans-cjk-jp',
            'fill', '#333333', 'gravity', 'West'
          ),
          'headline', jsonb_build_object(
            'x', 90, 'y', 180, 'width', 820, 'height', 220,
            'pointSize', 64, 'fontKey', 'noto-sans-cjk-jp-bold',
            'fill', '#222222', 'gravity', 'West'
          ),
          'body', jsonb_build_object(
            'x', 90, 'y', 1180, 'width', 820, 'height', 180,
            'pointSize', 34, 'fontKey', 'noto-sans-cjk-jp',
            'fill', '#333333', 'gravity', 'West'
          )
        )
      )
    ),
    allowed_operations = CASE
      WHEN allowed_operations @> '["deterministic_copy_overlay"]'::jsonb THEN allowed_operations
      ELSE allowed_operations || '["deterministic_copy_overlay"]'::jsonb
    END,
    validation_rules = COALESCE(validation_rules, '{}'::jsonb) || jsonb_build_object(
      'copyRestrictedClaims',
      '["防臭","抗菌","消臭","発熱","吸湿発熱","遠赤外線","純綿","100%綿","オーガニックコットン","羊毛100%","医療用","着圧","血行促進"]'::jsonb,
      'copyRequiresApprovedDerivedSource', true,
      'copyHumanReviewRequired', true
    ),
    metadata = COALESCE(metadata, '{}'::jsonb) || '{"copyOverlayStage":"v1","copyOverlayPolicy":"deterministic-only"}'::jsonb,
    updated_at = NOW(),
    record_version = record_version + 1
WHERE id = 'dtpl_socks_rakuten_benefit_1000x1500_v1';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.design_templates
    WHERE id='dtpl_socks_rakuten_benefit_1000x1500_v1'
      AND allowed_operations @> '["deterministic_copy_overlay"]'::jsonb
      AND layout_spec ? 'copyOverlay'
  ) THEN
    RAISE EXCEPTION '0097 deterministic copy overlay template contract was not installed';
  END IF;
END $$;

COMMIT;
