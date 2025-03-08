#!/usr/bin/env python3
import re
import os

def extract_css_selectors(css_file):
    """Extract all selectors from CSS file."""
    with open(css_file, 'r') as f:
        css_content = f.read()
    
    # Remove comments to avoid false matches
    css_content = re.sub(r'/\*.*?\*/', '', css_content, flags=re.DOTALL)
    
    # Find all CSS rule sets (everything before a { that isn't inside another block)
    rule_pattern = r'([^{]+?)\s*{[^}]*}'
    rules = re.findall(rule_pattern, css_content)
    
    # Extract all selectors from the rules
    selectors = []
    for rule in rules:
        # Split combined selectors and strip whitespace
        rule_selectors = [s.strip() for s in rule.split(',')]
        selectors.extend(rule_selectors)
    
    # Remove @import rules and other non-selector entries
    selectors = [s for s in selectors if not s.startswith('@') and s]
    
    return selectors

def extract_html_content(html_file):
    """Extract relevant content from HTML for checking against selectors."""
    with open(html_file, 'r') as f:
        html_content = f.read()
    
    # Extract class names
    class_pattern = r'class=["\'](.*?)["\']'
    class_attributes = re.findall(class_pattern, html_content)
    
    classes = set()
    for attr in class_attributes:
        for cls in attr.split():
            classes.add(cls)
    
    # Extract HTML tags
    tag_pattern = r'<([a-zA-Z][a-zA-Z0-9]*)'
    tags = set(re.findall(tag_pattern, html_content))
    
    # Extract IDs
    id_pattern = r'id=["\'](.*?)["\']'
    ids = set(re.findall(id_pattern, html_content))
    
    return {
        'classes': classes,
        'tags': tags,
        'ids': ids,
        'content': html_content
    }

def check_selector_in_html(selector, html_data):
    """Basic check if a selector might be used in HTML."""
    # Class selector
    if selector.startswith('.'):
        class_name = selector[1:].split(':')[0].split('::')[0]
        return class_name in html_data['classes']
    
    # ID selector
    elif selector.startswith('#'):
        id_name = selector[1:].split(':')[0].split('::')[0]
        return id_name in html_data['ids']
    
    # Element selector
    elif re.match(r'^[a-zA-Z][a-zA-Z0-9]*$', selector):
        return selector in html_data['tags'] or selector in ['body', 'html']
    
    # Pseudo-elements and complex selectors
    else:
        # Check if any class mentioned in the selector is in the HTML
        class_matches = re.findall(r'\.([a-zA-Z0-9_-]+)', selector)
        for class_match in class_matches:
            if class_match in html_data['classes']:
                return True
        
        # Check if any tag mentioned in the selector is in the HTML
        tag_matches = re.finditer(r'(?:^|\s|>)([a-zA-Z][a-zA-Z0-9]*)(?=[\s:.>[]|$)', selector)
        for tag_match in tag_matches:
            tag = tag_match.group(1)
            if tag in html_data['tags'] or tag in ['body', 'html']:
                return True
        
        # For very complex selectors, we'll consider them used if we can't prove otherwise
        return True

def main():
    # File paths
    css_file = 'new.css'
    html_file = 'index.html'
    
    # Make sure both files exist
    if not os.path.exists(css_file) or not os.path.exists(html_file):
        print(f"Error: Make sure both {css_file} and {html_file} exist in the current directory.")
        return
    
    # Extract data
    css_selectors = extract_css_selectors(css_file)
    html_data = extract_html_content(html_file)
    
    # Print all selectors
    print(f"Found {len(css_selectors)} CSS selectors in {css_file}:")
    for selector in css_selectors:
        in_html = check_selector_in_html(selector, html_data)
        status = "used" if in_html else "UNUSED"
        print(f"- {selector} ({status})")
    
    # Summary
    unused_count = sum(1 for selector in css_selectors 
                      if not check_selector_in_html(selector, html_data))
    
    print(f"\nFound {len(html_data['classes'])} unique class names in {html_file}")
    print(f"Found {len(html_data['tags'])} unique HTML element types in {html_file}")
    print(f"Found {len(html_data['ids'])} unique IDs in {html_file}")
    
    if unused_count > 0:
        print(f"\n{unused_count} CSS selectors might not be used in the HTML file.")
    else:
        print("\nAll CSS selectors appear to be used in the HTML file!")

if __name__ == "__main__":
    main()