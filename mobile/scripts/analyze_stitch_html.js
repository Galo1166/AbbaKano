const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\LENOVO\\abbakano_data_sub_app\\stitch_abbakano_data_sub';
const folders = fs.readdirSync(baseDir).filter(f => fs.statSync(path.join(baseDir, f)).isDirectory());

console.log('Folders in stitch export:', folders);

const screens = [
  'abbakano_data_sub_welcome_landing_dark_mode',
  'abbakano_data_sub_sign_in_dark_mode',
  'abbakano_data_sub_sign_up_register_dark_mode',
  'abbakano_data_sub_app_lock_pin_dark_mode',
  'abbakano_data_sub_home_dashboard_dark_mode',
  'abbakano_data_sub_fund_wallet_dark_mode',
  'abbakano_data_sub_buy_data_bundle_dark_mode',
  'abbakano_data_sub_bills_utilities_portal_dark_mode',
  'abbakano_data_sub_transactions_history_dark_mode',
  'abbakano_data_sub_transaction_confirmation_pin_checkout_2',
  'abbakano_data_sub_profile_settings_dark_mode',
  'abbakano_data_sub_refer_earn_dark_mode'
];

screens.forEach(s => {
  const htmlPath = path.join(baseDir, s, 'code.html');
  if (fs.existsSync(htmlPath)) {
    const content = fs.readFileSync(htmlPath, 'utf8');
    console.log(`\n=== Screen: ${s} (Length: ${content.length}) ===`);
    // extract body content
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      // print clean text snippets
      const body = bodyMatch[1];
      // strip script/style
      const clean = body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
      const textMatches = clean.match(/>([^<]+)</g) || [];
      const textSample = textMatches.map(t => t.replace(/[><]/g, '').trim()).filter(t => t.length > 2).slice(0, 20);
      console.log('Text content samples:', textSample.join(' | '));
    }
  } else {
    console.log(`Not found: ${htmlPath}`);
  }
});
