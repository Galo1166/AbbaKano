import { supabase } from '@/lib/supabase';

export interface DataPlan {
  id: string;
  network: string;
  dataAmount: string;
  price: number;
  validity: string;
  planType: string;
  type?: string;
  purchaseAvailable?: boolean;
  planToken?: string;
}

const planCache = new Map<string, { plans: DataPlan[]; expiresAt: number }>();
const planRequests = new Map<string, Promise<DataPlan[]>>();

export const fetchDataPlans = async (
  network = 'MTN',
  category?: 'GENERAL' | 'SME' | 'GIFTING' | 'DIRECT',
): Promise<DataPlan[]> => {
  const cacheKey = network.toUpperCase();
  const cached = planCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return category
      ? cached.plans.filter((plan) => plan.planType.toUpperCase() === category)
      : cached.plans;
  }
  const pending = planRequests.get(cacheKey);
  if (pending) {
    const plans = await pending;
    return category
      ? plans.filter((plan) => plan.planType.toUpperCase() === category)
      : plans;
  }

  const request = (async () => {
    const { data, error } = await supabase.functions.invoke<{ plans?: {
    label: string;
    price: number;
    code: string;
    category?: string;
    selectionToken?: string;
    purchaseAvailable?: boolean;
    }[]; message?: string }>('data-services', {
      body: { network },
    });
    if (error) throw error;
    if (!data) throw new Error('Data plans service returned no response.');
    const plans = (data.plans || []).map((plan) => ({
      id: `${network}-${plan.code}`,
      network,
      dataAmount: plan.label,
      price: Number(plan.price),
      validity: '',
      planType: plan.category || 'GENERAL',
      type: plan.category || 'GENERAL',
      planToken: plan.selectionToken,
      purchaseAvailable: plan.purchaseAvailable !== false,
    }));
    planCache.set(cacheKey, { plans, expiresAt: Date.now() + 30_000 });
    return plans;
  })().finally(() => planRequests.delete(cacheKey));
  planRequests.set(cacheKey, request);
  const plans = await request;
  return category
    ? plans.filter((plan) => plan.planType.toUpperCase() === category)
    : plans;
};
