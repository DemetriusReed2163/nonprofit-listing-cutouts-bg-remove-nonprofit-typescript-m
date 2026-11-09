import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listingBody, listingRecord } from './listing_policy.ts';

test('withhold receipt without consent while counting the donation', () => {
  const input = listingBody.parse({ listingId: '8eca6f33-4930-42d8-914f-bb577094ca64', campaignId: 'winter-aid', image: 'https://example.org/chair.png', donatedValueCents: 4500, receiptConsent: false, volunteerAssigned: false });
  const result = listingRecord(input, 'chair.png');
  assert.equal(result.donorReceipt.status, 'withheld');
  assert.equal(result.volunteerReminder.status, 'needs_assignment');
  assert.equal(result.campaignReport.donatedValueCents, 4500);
  assert.equal(result.campaignReport.items, 1);
  assert.equal(listingBody.safeParse({ ...input, donatedValueCents: -1 }).success, false);
});
