// Bounty policy config — matches the Cat Care Bounty Policy doc exactly

export type BountyType = 'feeding' | 'colony_care' | 'tnr' | 'vet_transport' | 'emergency' | 'medical';
export type Difficulty = 'easy' | 'standard' | 'hard' | 'extreme';
export type BountyStatus = 'open' | 'claimed' | 'completed' | 'expired' | 'cancelled';
export type ClaimStatus = 'active' | 'submitted' | 'approved' | 'rejected' | 'expired';

export interface BountyTypeConfig {
  label: string;
  emoji: string;
  description: string;
  baseAmount: number;
  maxAmount: number;
  claimWindowHours: number;
  escalationSteps: { afterDays: number; bonus: number }[];
  proofRequirements: string[];
  color: string;
}

export const BOUNTY_TYPES: Record<BountyType, BountyTypeConfig> = {
  feeding: {
    label: 'Feed / Colony Check',
    emoji: '🍽️',
    description: 'Provide food, water, and a quick wellness check. Upload photo proof to get paid.',
    baseAmount: 4,
    maxAmount: 8,
    claimWindowHours: 12,
    escalationSteps: [
      { afterDays: 3, bonus: 1 },
      { afterDays: 7, bonus: 1 },
      { afterDays: 14, bonus: 2 },
    ],
    proofRequirements: ['Photo of food/water setup or cat', 'Timestamped submission', 'Location confirmation'],
    color: '#4CAF50',
  },
  colony_care: {
    label: 'Managed Colony Care',
    emoji: '🏘️',
    description: 'Recurring care for an established colony. Feeding schedule, monitoring, reporting new arrivals.',
    baseAmount: 40,
    maxAmount: 60,
    claimWindowHours: 720, // 30 days
    escalationSteps: [
      { afterDays: 14, bonus: 10 },
      { afterDays: 30, bonus: 10 },
    ],
    proofRequirements: ['Regular check-in logs', 'Photo updates', 'Incident reports if any'],
    color: '#2196F3',
  },
  tnr: {
    label: 'TNR Completion',
    emoji: '✂️',
    description: 'Trap, transport, and complete sterilization. Payout released after verified completion.',
    baseAmount: 60,
    maxAmount: 100,
    claimWindowHours: 72,
    escalationSteps: [
      { afterDays: 5, bonus: 10 },
      { afterDays: 10, bonus: 10 },
      { afterDays: 21, bonus: 20 },
    ],
    proofRequirements: ['Before photo if possible', 'Clinic paperwork', 'Ear-tip photo if applicable', 'Release/return confirmation'],
    color: '#9C27B0',
  },
  vet_transport: {
    label: 'Vet Transport / Visit',
    emoji: '🚗',
    description: 'Take this cat to its scheduled appointment and upload proof of visit completion.',
    baseAmount: 35,
    maxAmount: 60,
    claimWindowHours: 24,
    escalationSteps: [
      { afterDays: 2, bonus: 10 },
      { afterDays: 5, bonus: 15 },
    ],
    proofRequirements: ['Appointment confirmation or discharge paperwork', 'Transport confirmation', 'Invoice if reimbursement requested'],
    color: '#FF9800',
  },
  emergency: {
    label: 'Emergency Rescue',
    emoji: '🚨',
    description: 'Urgent help needed for a sick or injured cat. Fast response strongly encouraged.',
    baseAmount: 50,
    maxAmount: 100,
    claimWindowHours: 6,
    escalationSteps: [
      { afterDays: 1, bonus: 25 },
      { afterDays: 3, bonus: 25 },
    ],
    proofRequirements: ['Photo or video showing urgent condition', 'Intake or handoff proof', 'Clinic or foster transfer confirmation'],
    color: '#F44336',
  },
  medical: {
    label: 'Medical Reimbursement',
    emoji: '🏥',
    description: 'Approved vet examination, treatment, medication, diagnostics, surgery, or follow-up care.',
    baseAmount: 0,
    maxAmount: 9999,
    claimWindowHours: 168, // 7 days to submit
    escalationSteps: [],
    proofRequirements: ['Invoice upload', 'Receipts', 'Disclosure of other funding sources'],
    color: '#E91E63',
  },
};

export const DIFFICULTY_BONUS: Record<Difficulty, number | 'manual'> = {
  easy: 0,
  standard: 0.20, // +20%
  hard: 0.50,     // +50%
  extreme: 'manual',
};

export function calcCurrentAmount(
  baseAmount: number,
  maxAmount: number,
  bountyType: BountyType,
  createdAt: string,
  escalationPaused: boolean,
  communityBoost: number = 0,
  difficultyBonus: number = 0,
): number {
  if (bountyType === 'medical') return baseAmount + communityBoost;
  const policy = BOUNTY_TYPES[bountyType];
  const daysSincePosted = escalationPaused ? 0 :
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);

  let escalationBonus = 0;
  for (const step of policy.escalationSteps) {
    if (daysSincePosted >= step.afterDays) escalationBonus += step.bonus;
  }

  const total = baseAmount + escalationBonus + difficultyBonus + communityBoost;
  return Math.min(total, maxAmount);
}

export function getClaimWindowLabel(type: BountyType): string {
  const hours = BOUNTY_TYPES[type].claimWindowHours;
  if (hours <= 12) return `${hours} hours`;
  if (hours < 48) return `${hours} hours`;
  if (hours < 168) return `${Math.round(hours / 24)} days`;
  return `${Math.round(hours / 24 / 7)} week${hours >= 336 ? 's' : ''}`;
}
