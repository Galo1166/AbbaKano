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

function planCapacity(label: string) {
  const match = label.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB)/i);
  if (!match) return Number.POSITIVE_INFINITY;
  const amount = Number(match[1]);
  const unit = match[2].toUpperCase();
  return amount * (unit === 'KB' ? 1 / 1024 : unit === 'GB' ? 1024 : unit === 'TB' ? 1024 * 1024 : 1);
}

function sortPlans(plans: DataPlan[]) {
  return [...plans].sort((a, b) => {
    const capacityDifference = planCapacity(a.dataAmount) - planCapacity(b.dataAmount);
    if (capacityDifference !== 0) return capacityDifference;
    const priceDifference = a.price - b.price;
    if (priceDifference !== 0) return priceDifference;
    return a.dataAmount.localeCompare(b.dataAmount, undefined, { numeric: true, sensitivity: 'base' });
  });
}

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
    if (!data) throw new Error('We could not load data plans right now. Please try again.');
    const plans = sortPlans((data.plans || []).map((plan) => ({
      id: `${network}-${plan.code}`,
      network,
      dataAmount: plan.label,
      price: Number(plan.price),
      validity: '',
      planType: plan.category || 'GENERAL',
      type: plan.category || 'GENERAL',
      planToken: plan.selectionToken,
      purchaseAvailable: plan.purchaseAvailable !== false,
    })));
    planCache.set(cacheKey, { plans, expiresAt: Date.now() + 30_000 });
    return plans;
  })().finally(() => planRequests.delete(cacheKey));
  planRequests.set(cacheKey, request);
  const plans = await request;
  return category
    ? plans.filter((plan) => plan.planType.toUpperCase() === category)
    : plans;
};
