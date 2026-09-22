const fs = require('fs');
const path = require('path');

const base = 'C:\\Users\\LENOVO\\abbakano_data_sub_app\\stitch_abbakano_data_sub';
const screens = [
  'abbakano_data_sub_welcome_landing_dark_mode',
  'abbakano_data_sub_sign_in_dark_mode',
  'abbakano_data_sub_sign_up_register_dark_mode',
  'abbakano_data_sub_app_lock_pin_dark_mode',
  'abbakano_data_sub_fund_wallet_dark_mode',
  'abbakano_data_sub_buy_data_bundle_dark_mode',
  'abbakano_data_sub_bills_utilities_portal_dark_mode',
  'abbakano_data_sub_transactions_history_dark_mode',
  'abbakano_data_sub_transaction_confirmation_pin_checkout_2',
  'abbakano_data_sub_profile_settings_dark_mode',
  'abbakano_data_sub_refer_earn_dark_mode'
];

screens.forEach(s => {
  const p = path.join(base, s, 'code.html');
  if (fs.existsSync(p)) {
    const raw = fs.readFileSync(p, 'utf8');
    const mainMatch = raw.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const clean = (mainMatch ? mainMatch[0] : raw)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\s{2,}/g, ' ');
    fs.writeFileSync(`C:\\Users\\LENOVO\\abbakano_data_sub_app\\scripts\\${s}.txt`, clean);
    console.log(`Wrote ${s}.txt (${clean.length} chars)`);
  }
});
