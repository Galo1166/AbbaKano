INSERT INTO public.admin_system_settings (id, settings)
VALUES (
  TRUE,
  jsonb_build_object(
    'airtimeProviderPrimary', 'ALRAHUZDATA',
    'dataProviderPrimary', 'ALRAHUZDATA'
  )
)
ON CONFLICT (id) DO UPDATE
SET settings = public.admin_system_settings.settings || EXCLUDED.settings;
