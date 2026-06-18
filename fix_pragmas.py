import glob
import re

html_files = glob.glob('Templates/*.html')
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Prepend the pragmas to the start of the inline text/babel scripts
    # Be careful not to prepend to external scripts
    
    def replacer(match):
        script_start = match.group(1)
        script_content = match.group(2)
        script_end = match.group(3)
        
        # If it already has it, skip
        if '/** @jsx React.createElement */' in script_content:
            return match.group(0)
            
        return f"{script_start}\n/** @jsx React.createElement */\n/** @jsxFrag React.Fragment */\n{script_content}{script_end}"

    content = re.sub(r'(<script[^>]*type="text/babel"[^>]*>)(.*?)(</script>)', replacer, content, flags=re.DOTALL)
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done")
