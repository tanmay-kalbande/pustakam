// src/types/plan.ts
// Access types and limits for Pustakam - monthly and yearly access windows

export type PlanType = 'monthly' | 'yearly';

export interface PlanLimits {
    maxBooks: number; // -1 for unlimited
    name: string;
    description: string;
}

export const PLAN_CONFIG: Record<PlanType, PlanLimits> = {
    monthly: {
        maxBooks: -1, // unlimited
        name: 'Monthly Access',
        description: 'Unlimited book generation during the active access window',
    },
    yearly: {
        maxBooks: -1, // unlimited
        name: 'Yearly Access',
        description: 'Unlimited book generation during the active access window',
    },
};

// Duration in days for each access window
export const PLAN_DURATION_DAYS: Record<PlanType, number> = {
    monthly: 30,
    yearly: 365,
};

// Legacy numeric configuration
export const PLAN_PRICING: Record<PlanType, number> = {
    monthly: 0,
    yearly: 0,
};

export interface UserPlan {
    plan: PlanType;
    planExpiresAt: Date | null;
    booksCreated: number;
    isActive: boolean;
}

// Check if a plan is active (not expired)
export function isPlanActive(plan: PlanType, expiresAt: string | null): boolean {
    if (!expiresAt) return true; // No expiry means always active
    return new Date(expiresAt) > new Date();
}

// Get remaining books (always unlimited for active access)
export function getBooksRemaining(plan: PlanType, booksCreated: number): number {
    return Infinity; // Unlimited for all plans
}

// Check if user can create a book (always true for active access)
export function canCreateBook(plan: PlanType, booksCreated: number, expiresAt: string | null): boolean {
    return isPlanActive(plan, expiresAt);
}
