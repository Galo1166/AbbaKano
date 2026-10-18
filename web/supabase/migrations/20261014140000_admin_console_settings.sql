CREATE TABLE IF NOT EXISTS public.admin_system_settings (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(settings) = 'object'),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.admin_system_settings (id, settings)
VALUES (
    TRUE,
    jsonb_build_object(
        'appMaintenanceMode', FALSE,
        'maintenanceMessage', 'We are currently performing maintenance. Please try again later.',
        'alertPhoneNumbers', '[]'::jsonb,
        'lowBalanceThresholdNaira', 0,
        'dualApprovalAmountThreshold', 0,
        'maxSingleManualCredit', 0,
        'vtuGatewayPrimary', 'VTUGATE',
        'vtuGatewayFallback', ''
    )
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.admin_margin_settings (
    carrier TEXT PRIMARY KEY CHECK (
        carrier IN (
            'MTN', 'AIRTEL', 'GLO', '9MOBILE', 'AEDC', 'IKEDC', 'KEDCO',
            'PHED', 'JED', 'DSTV', 'GOTV', 'STARTIMES', 'VTUGATE'
        )
    ),
    wholesale_base NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (wholesale_base >= 0),
    sme_margin NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (sme_margin >= 0),
    gifting_margin NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (gifting_margin >= 0),
    airtime_percent NUMERIC(5, 2) NOT NULL DEFAULT 0
        CHECK (airtime_percent >= 0 AND airtime_percent <= 100),
    is_sales_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by TEXT NOT NULL DEFAULT 'System',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.admin_margin_settings (carrier)
VALUES
    ('MTN'), ('AIRTEL'), ('GLO'), ('9MOBILE'), ('AEDC'), ('IKEDC'),
    ('KEDCO'), ('PHED'), ('JED'), ('DSTV'), ('GOTV'), ('STARTIMES'), ('VTUGATE')
ON CONFLICT (carrier) DO NOTHING;

ALTER TABLE public.admin_system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_margin_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_system_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.admin_margin_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.admin_system_settings TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.admin_margin_settings TO service_role;
