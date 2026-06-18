import glob

html_files = glob.glob('Templates/*.html')
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the babel CDN
    content = content.replace('unpkg.com/@babel/standalone/babel.min.js', 'unpkg.com/@babel/standalone@7.21.0/babel.min.js')
    
    # Also fix the cache bust
    content = content.replace('?v=2.4', '?v=2.5')

    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)
