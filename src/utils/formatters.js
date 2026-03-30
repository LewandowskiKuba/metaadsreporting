export function formatCurrency(value, currency = 'PLN') {
  if (value === null || value === undefined || value === '') return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency || 'PLN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('pl-PL').format(Math.round(num));
}

export function formatPercent(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return num.toFixed(decimals) + '%';
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}`;
}

// Returns the value of a specific action_type from a Meta actions array
export function getActionValue(arr, types) {
  if (!arr || !Array.isArray(arr)) return 0;
  const list = Array.isArray(types) ? types : [types];
  for (const type of list) {
    const found = arr.find(a => a.action_type === type);
    if (found) return parseFloat(found.value) || 0;
  }
  return 0;
}

// Sum all lead-type actions
export function getTotalLeads(actions) {
  if (!actions || !Array.isArray(actions)) return 0;
  const leadTypes = [
    'lead',
    'offsite_conversion.fb_pixel_lead',
    'contact',
    'submit_application',
    'complete_registration',
    'offsite_conversion.fb_pixel_custom',
  ];
  return leadTypes.reduce((sum, type) => {
    const a = actions.find(x => x.action_type === type);
    return sum + (a ? parseFloat(a.value) || 0 : 0);
  }, 0);
}

export function getCallCount(actions) {
  return getActionValue(actions, 'click_to_call_call_confirm');
}

export function getOutboundClicks(outboundClicksArr) {
  if (!outboundClicksArr || !Array.isArray(outboundClicksArr)) return 0;
  const found = outboundClicksArr.find(o => o.action_type === 'outbound_click');
  return found ? parseFloat(found.value) || 0 : 0;
}

// Abbreviated numbers for chart axes
export function shortNum(value) {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K';
  return String(value);
}
