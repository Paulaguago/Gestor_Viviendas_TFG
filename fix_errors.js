const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('routes').filter(f => f.endsWith('.js'));
files.forEach(f => {
    let p = path.join('routes', f);
    let cont = fs.readFileSync(p, 'utf8');
    let ori = cont;
    
    cont = cont.replace(/res\.status\(\d+\)\.send\([^)]+?\+\s*error\.message\)/g, 'res.status(500).send(getUserFriendlyErrorMessage(error))');
    cont = cont.replace(/error\s*:\s*error\.message/g, 'error: getUserFriendlyErrorMessage(error)');
    cont = cont.replace(/detail\s*:\s*e\.message/g, 'detail: getUserFriendlyErrorMessage(e)');
    cont = cont.replace(/\+\s*error\.message/g, '+ getUserFriendlyErrorMessage(error)');
    
    if (cont !== ori) {
        if (!cont.includes('getUserFriendlyErrorMessage')) {
            cont = `const { getUserFriendlyErrorMessage } = require('../utils/errorHandler');\n` + cont;
        }
        fs.writeFileSync(p, cont);
        console.log(`Updated ${f}`);
    }
});