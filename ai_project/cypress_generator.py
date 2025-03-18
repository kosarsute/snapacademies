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

def generate_cypress_code(test_case):
    magic_link = get_magic_link()
    if not magic_link:
        return "console.error('Failed to retrieve Magic Link.');"

    steps = test_case.get("steps", [])
    if not steps:
        return "console.error('No valid test steps found.');"

    script_lines = [
        "describe('Test Suite', () => {",
        "  it('Executes test steps', () => {",
        f"    cy.visit('{magic_link}');",
        "    cy.wait(2000);",
    ]

    for step in steps:
        action = step.get("action", "").strip()
        selector = json.dumps(step.get("selector", "").strip())

        if action == "click":
            script_lines.append(f"    cy.get({selector}).click();")
            script_lines.append("    cy.wait(1000);")

        elif action == "fill":
            input_text = json.dumps(step.get("value", "test-data"))
            script_lines.append(f"    cy.get({selector}).type({input_text});")
            script_lines.append("    cy.wait(1000);")

        elif action == "press":
            key = json.dumps(step.get("key", "Enter"))
            script_lines.append(f"    cy.get({selector}).type({key});")
            script_lines.append("    cy.wait(1000);")

    script_lines.append("  });")
    script_lines.append("});")

    return "\n".join(script_lines)
