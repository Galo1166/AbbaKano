import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createDataPlanToken } from "../_shared/data-plan-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const EXAM_BODIES = ["WAEC", "NECO", "JAMB"] as const;
type ExamBody = (typeof EXAM_BODIES)[number];

interface EducationCatalogItem {
  id: string;
  examBody: ExamBody;
  planCode: string;
  name: string;
  label: string;
  price: number;
  serviceId: string;
  portalUrl: string;
  description: string;
  instructions: string;
}

const CATALOG: EducationCatalogItem[] = [
  {
    id: "waec-result-checker",
    examBody: "WAEC",
    planCode: "waec-result-checker",
    name: "WAEC Result Checker e-PIN",
    label: "WAEC Result Checker e-PIN",
    price: 3800,
    serviceId: "waec",
    portalUrl: "https://www.waecdirect.org",
    description: "Official PIN & Serial number to check WAEC May/June and GCE results.",
    instructions: "Visit www.waecdirect.org, enter your 10-digit Examination Number, select Examination Year & Type, enter PIN and Serial number, and click Submit.",
  },
  {
    id: "neco-result-token",
    examBody: "NECO",
    planCode: "neco-result-token",
    name: "NECO Result Token",
    label: "NECO Result Token",
    price: 1350,
    serviceId: "neco",
    portalUrl: "https://result.neco.gov.ng",
    description: "Official Token to check NECO SSCE Internal, External, BECE & NCEE results.",
    instructions: "Visit result.neco.gov.ng, select Exam Year and Exam Type, enter your Token and Registration Number, then click Check Result.",
  },
  {
    id: "jamb-utme",
    examBody: "JAMB",
    planCode: "jamb-utme",
    name: "JAMB UTME Registration e-PIN",
    label: "JAMB UTME Registration e-PIN",
    price: 6200,
    serviceId: "jamb",
    portalUrl: "https://www.jamb.gov.ng",
    description: "Official JAMB UTME Registration profile e-PIN without Mock.",
    instructions: "Provide your 10-digit Profile Code. Take this generated e-PIN to any accredited JAMB CBT centre to complete your UTME registration.",
  },
  {
    id: "jamb-mock",
    examBody: "JAMB",
    planCode: "jamb-mock",
    name: "JAMB UTME with Mock e-PIN",
    label: "JAMB UTME with Mock e-PIN",
    price: 7700,
    serviceId: "jamb",
    portalUrl: "https://www.jamb.gov.ng",
    description: "Official JAMB UTME + Mock Examination Registration profile e-PIN.",
    instructions: "Provide your 10-digit Profile Code. Take this generated e-PIN to any accredited JAMB CBT centre for UTME + Mock registration.",
  },
  {
    id: "jamb-direct-entry",
    examBody: "JAMB",
    planCode: "jamb-direct-entry",
    name: "JAMB Direct Entry (DE) e-PIN",
    label: "JAMB Direct Entry (DE) e-PIN",
    price: 6200,
    serviceId: "jamb",
    portalUrl: "https://www.jamb.gov.ng",
    description: "Official JAMB Direct Entry (DE) Registration profile e-PIN.",
    instructions: "Provide your 10-digit Profile Code. Take this generated e-PIN to any accredited JAMB CBT centre to complete Direct Entry registration.",
  },
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!rawSecretKeys || !supabaseUrl || !anonKey) {
      return jsonResponse({ message: "Education service configuration is incomplete." }, 500);
    }

    const secretKeys = JSON.parse(rawSecretKeys);
    const serviceKey = secretKeys.default;
    if (!serviceKey) {
      return jsonResponse({ message: "Supabase service key is not configured." }, 500);
    }

    let filterExamBody: string | null = null;
    let candidateNumber: string | undefined;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.examBody) {
          filterExamBody = String(body.examBody).trim().toUpperCase();
        }
        if (body?.candidateNumber) {
          candidateNumber = String(body.candidateNumber).trim();
        }
      } catch {
        // Body is optional
      }
    } else {
      const url = new URL(req.url);
      const queryExam = url.searchParams.get("examBody");
      if (queryExam) filterExamBody = queryExam.trim().toUpperCase();
      const queryCandidate = url.searchParams.get("candidateNumber");
      if (queryCandidate) candidateNumber = queryCandidate.trim();
    }

    const filtered = filterExamBody
      ? CATALOG.filter((item) => item.examBody === filterExamBody)
      : CATALOG;

    const itemsWithTokens = await Promise.all(
      filtered.map(async (item) => {
        const token = await createDataPlanToken(
          {
            provider: "vtugate",
            network: item.examBody,
            label: item.label,
            serviceId: item.serviceId,
            planCode: item.planCode,
            price: item.price,
            ...(candidateNumber && /^\d{8,14}$/.test(candidateNumber)
              ? { accountNumber: candidateNumber }
              : {}),
          },
          serviceKey,
        );

        return {
          ...item,
          token,
        };
      }),
    );

    return jsonResponse({
      examBodies: EXAM_BODIES,
      services: itemsWithTokens,
    });
  } catch (error) {
    console.error("education-services error:", error);
    return jsonResponse(
      { message: error instanceof Error ? error.message : "Failed to load education services." },
      500,
    );
  }
});
