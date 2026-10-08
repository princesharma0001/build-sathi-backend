import {prisma} from '../src/config/database';
import {FREE_QUOTATION_LIMIT} from '../src/config/subscription';

// Dummy plan values - change them later with PATCH /subscriptions/admin/plans/:id
const plans = [
  {
    code: 'STANDARD',
    name: 'Standard',
    description: 'Good for small sellers getting started',
    price: 499,
    quotationLimit: 25,
    validityDays: 90,
    hasTrustedBadge: false,
    sortOrder: 1,
    features: ['25 quotations', 'Valid for 90 days', 'Email support'],
  },
  {
    code: 'PLUS',
    name: 'Plus',
    description: 'More quotations for growing businesses',
    price: 1299,
    quotationLimit: 75,
    validityDays: 180,
    hasTrustedBadge: false,
    sortOrder: 2,
    features: ['75 quotations', 'Valid for 180 days', 'Priority support'],
  },
  {
    code: 'PRO',
    name: 'Pro',
    description: 'Maximum reach with the Trusted Seller badge',
    price: 2999,
    quotationLimit: 200,
    validityDays: 365,
    hasTrustedBadge: true,
    sortOrder: 3,
    features: [
      '200 quotations',
      'Valid for 365 days',
      'Trusted Seller badge',
      'Priority support',
    ],
  },
];

async function main() {
  // Plans: created once, never overwritten (so admin edits are kept)
  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: {code: plan.code},
      update: {},
      create: plan,
    });
  }
  console.log(`Plans ready: ${plans.map(p => p.code).join(', ')}`);

  // One-time backfill: quotes sent before this feature count against the free limit.
  // Safe to re-run.
  const grouped = await prisma.quote.groupBy({
    by: ['sellerId'],
    _count: {_all: true},
  });

  for (const row of grouped) {
    const used = Math.min(row._count._all, FREE_QUOTATION_LIMIT);

    await prisma.user.updateMany({
      where: {id: row.sellerId, freeQuotesUsed: {lt: used}},
      data: {freeQuotesUsed: used},
    });
  }
  console.log(`Free quota backfilled for ${grouped.length} seller(s)`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());