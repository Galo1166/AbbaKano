const fs = require('fs');
const path = require('path');

const file = 'C:\\Users\\LENOVO\\abbakano_data_sub_app\\stitch_abbakano_data_sub\\abbakano_data_sub_home_dashboard_dark_mode\\code.html';
const content = fs.readFileSync(file, 'utf8');

// Extract main content between <main> and </main>
const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
const headerMatch = content.match(/<header[^>]*>([\s\S]*?)<\/header>/i);
const navMatch = content.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);

fs.writeFileSync(
  'C:\\Users\\LENOVO\\abbakano_data_sub_app\\scripts\\home_dashboard_extracted.html',
  `=== HEADER ===\n${headerMatch ? headerMatch[0] : ''}\n\n=== MAIN ===\n${mainMatch ? mainMatch[0] : ''}\n\n=== NAV ===\n${navMatch ? navMatch[0] : ''}`
);

console.log('Saved home_dashboard_extracted.html. Size:', fs.statSync('C:\\Users\\LENOVO\\abbakano_data_sub_app\\scripts\\home_dashboard_extracted.html').size);
