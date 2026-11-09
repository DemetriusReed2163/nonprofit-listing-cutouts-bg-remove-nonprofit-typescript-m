import { z } from 'zod';

export const listingBody = z.object({
  listingId: z.string().uuid(),
  campaignId: z.string().regex(/^[a-z0-9-]{1,60}$/),
  image: z.string().url(),
  donatedValueCents: z.number().int().nonnegative(),
  receiptConsent: z.boolean(),
  volunteerAssigned: z.boolean()
}).strict();

export type Listing = z.infer<typeof listingBody>;

export function listingRecord(input: Listing, objectKey: string) {
  return {
    listingId: input.listingId,
    cutout: objectKey,
    donorReceipt: { status: input.receiptConsent ? 'ready' : 'withheld' },
    volunteerReminder: { status: input.volunteerAssigned ? 'ready' : 'needs_assignment' },
    campaignReport: { campaignId: input.campaignId, items: 1, donatedValueCents: input.donatedValueCents }
  };
}
