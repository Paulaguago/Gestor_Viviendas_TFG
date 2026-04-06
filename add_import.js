const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('routes').filter(f => f.endsWith('.js'));
files.forEach(f => {
    let p = path.join('routes', f);
    let c = fs.readFileSync(p, 'utf8');
    if (c.includes('getUserFriendlyErrorMessage(') && !c.includes('const { getUserFriendlyErrorMessage }')) {
        fs.writeFileSync(p, `const { getUserFriendlyErrorMessage } = require('../utils/errorHandler');\n` + c);
        console.log('Added to ' + f);
    }
});