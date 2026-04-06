import os
import re

routes_dir = 'routes'
files = [f for f in os.listdir(routes_dir) if f.endswith('.js')]

for file in files:
    filepath = os.path.join(routes_dir, file)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    content = re.sub(r"\.send\([^)]*?\+\s*error\\\.message\)", r".send(getUserFriendlyErrorMessage(error))", content)
    content = re.sub(r"error\s*:\s*error\\\.message", r"error: getUserFriendlyErrorMessage(error)", content)
    content = re.sub(r"detail\s*:\s*e\\\.message", r"detail: getUserFriendlyErrorMessage(e)", content)
    if content != original:
        if 'getUserFriendlyErrorMessage' not in content:
            last_req = content.rfind('require(')
            if last_req != -1:
                end_req = content.find(';', last_req)
                content = content[:end_req+1] + '\nconst { getUserFriendlyErrorMessage } = require(\'../utils/errorHandler\');\n' + content[end_req+1:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print('Done')
