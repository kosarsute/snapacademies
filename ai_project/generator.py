import json
import subprocess
import re

def get_magic_link():
    try:
        process = subprocess.run(["/usr/bin/python3", "magicLink.py"], capture_output=True, text=True, check=True)
        magic_link_regex = r"https:\/\/example\.com\/login\?token=[a-zA-Z0-9]+"
        match = re.search(magic_link_regex, process.stdout)

        if match:
            return match.group(0)
        return None

    except subprocess.CalledProcessError:
        return None

def generate_playwright_code(test_case):
    magic_link = get_magic_link()
    if not magic_link:
        return "print('Failed to retrieve Magic Link.')"

    steps = test_case.get("steps", [])
    if not steps:
        return "print('No valid test steps found.')"

    script_lines = [
        "from playwright.sync_api import sync_playwright",
        "import time",
        "",
        "def run_test():",
        "    with sync_playwright() as p:",
        "        browser = p.chromium.launch(headless=False)",
        "        page = browser.new_page()",
        "",
        f"        page.goto('{magic_link}')",
        "        time.sleep(2)",
    ]

    for step in steps:
        action = step.get("action", "").strip()
        selector = json.dumps(step.get("selector", "").strip())

        if action == "click":
            script_lines.append(f"        page.locator({selector}).click()")
            script_lines.append("        time.sleep(1)")

        elif action == "fill":
            input_text = json.dumps(step.get("value", "test-data"))
            script_lines.append(f"        page.locator({selector}).fill({input_text})")
            script_lines.append("        time.sleep(1)")

        elif action == "press":
            key = json.dumps(step.get("key", "Enter"))
            script_lines.append(f"        page.locator({selector}).press({key})")
            script_lines.append("        time.sleep(1)")

    script_lines.append("        browser.close()")
    script_lines.append("")
    script_lines.append("if __name__ == '__main__':")
    script_lines.append("    run_test()")

    return "\n".join(script_lines)
