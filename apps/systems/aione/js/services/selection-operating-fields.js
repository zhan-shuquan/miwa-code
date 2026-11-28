// Daily selection simulations remain editable after ERP intake; identities do not.
export const OPERATING_FIELDS = Object.freeze([
  'custom_aione_coupon_mode', 'custom_aione_coupon_amount', 'custom_aione_coupon',
  'custom_aione_points', 'custom_aione_ads', 'custom_aione_other',
  'operatingStrategy', 'custom_实际售价',
]);
export const operatingValues = data => Object.fromEntries(
  OPERATING_FIELDS.filter(key => Object.hasOwn(data, key)).map(key => [key, data[key]]),
);
