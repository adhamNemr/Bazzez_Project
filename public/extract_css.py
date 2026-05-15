import os

files_to_fix = [
    "expenses.html",
    "launcher.html",
    "monthly_report.html",
    "monthly_closing.html",
    "inventory.html"
]

for filename in files_to_fix:
    if not os.path.exists(filename):
        continue
    
    with open(filename, "r") as f:
        lines = f.readlines()
        
    start_idx = -1
    end_idx = -1
    
    for i, line in enumerate(lines):
        if "<style>" in line:
            start_idx = i
        if "</style>" in line:
            end_idx = i
            break
            
    if start_idx != -1 and end_idx != -1:
        css_name = filename.replace(".html", ".css")
        css_lines = lines[start_idx+1:end_idx]
        
        with open("css/" + css_name, "w") as f:
            f.writelines(css_lines)
            
        new_lines = lines[:start_idx] + [f"    <link rel=\"stylesheet\" href=\"./css/{css_name}\">\n"] + lines[end_idx+1:]
        
        with open(filename, "w") as f:
            f.writelines(new_lines)
        print(f"Fixed {filename} -> css/{css_name}")
