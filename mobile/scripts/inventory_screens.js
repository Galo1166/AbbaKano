/**
 * Full Stitch screen inventory + asset extractor
 * Outputs: screens.json with metadata for all 33 directories
 */
const fs = require('fs');
const path = require('path');

const STITCH_ROOT = path.join(__dirname, '..', 'stitch_abbakano_data_sub');
const OUTPUT_FILE = path.join(__dirname, 'screens_inventory.json');

const dirs = fs.readdirSync(STITCH_ROOT).filter(d => {
  const full = path.join(STITCH_ROOT, d);
  return fs.statSync(full).isDirectory();
});

const screens = dirs.map(dir => {
  const full = path.join(STITCH_ROOT, dir);
  const files = fs.readdirSync(full);
  const hasCode = files.includes('code.html');
  const hasScreen = files.includes('screen.png');
  const hasDesign = files.includes('DESIGN.md');

  let htmlSize = 0;
  let textPreview = '';
  if (hasCode) {
    const html = fs.readFileSync(path.join(full, 'code.html'), 'utf8');
    htmlSize = html.length;
    // Extract title/key text from the HTML (first 600 chars of visible text approx)
    textPreview = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 400);
  }

  // Determine theme
  const isDark = dir.includes('dark_mode');
  const isLight = !isDark && !dir.includes('vtu_pulse') && !dir.includes('image.png') && !dir.startsWith('abbakano_data_sub_1') && !dir.startsWith('abbakano_data_sub_2') && !dir.startsWith('file_');

  // Screen category
  let category = 'other';
  if (dir.includes('home_dashboard')) category = 'dashboard';
  else if (dir.includes('sign_in')) category = 'auth_login';
  else if (dir.includes('sign_up_register')) category = 'auth_register';
  else if (dir.includes('welcome_landing')) category = 'auth_welcome';
  else if (dir.includes('app_lock_pin')) category = 'auth_pin_lock';
  else if (dir.includes('forgot_password')) category = 'auth_forgot';
  else if (dir.includes('buy_data_bundle')) category = 'vtu_data';
  else if (dir.includes('bills_utilities_portal')) category = 'vtu_bills';
  else if (dir.includes('fund_wallet')) category = 'fund_wallet';
  else if (dir.includes('transactions_history')) category = 'ledger';
  else if (dir.includes('transaction_confirmation_pin')) category = 'checkout_pin';
  else if (dir.includes('profile_settings')) category = 'profile';
  else if (dir.includes('refer_earn')) category = 'refer_earn';

  const screenPngPath = hasScreen ? path.relative(path.dirname(OUTPUT_FILE), path.join(full, 'screen.png')) : null;

  return {
    dir,
    category,
    isDark,
    isLight,
    hasCode,
    hasScreen,
    hasDesign,
    htmlSize,
    screenPngPath: screenPngPath ? screenPngPath.replace(/\\/g, '/') : null,
    textPreview,
  };
});

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(screens, null, 2));
console.log(`Inventoried ${screens.length} screen directories.`);
screens.forEach(s => {
  const flags = [s.hasCode?'HTML':'    ', s.hasScreen?'PNG':'   ', s.hasDesign?'MD':'  '].join(' ');
  console.log(`[${flags}] [${s.category.padEnd(20)}] ${s.isDark?'DARK ':'LIGHT'} ${s.dir}`);
});
