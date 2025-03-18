import os
import json
import requests
import re
import time
import boto3
import subprocess
from dotenv import load_dotenv
from openai import OpenAI
from playwright.sync_api import sync_playwright

def is_running_on_aws():
    try:
        with open("/sys/hypervisor/uuid", "r") as f:
            return f.read().startswith("ec2")
    except FileNotFoundError:
        return False

ssm = boto3.client("ssm", region_name="us-west-2")

def get_secret(param_name):
    try:
        response = ssm.get_parameter(Name=param_name, WithDecryption=True)
        return response["Parameter"]["Value"]
    except Exception:
        return None

if not is_running_on_aws():
    load_dotenv()
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
else:
    OPENAI_API_KEY = get_secret("/app/OPENAI_API_KEY")

client = OpenAI(api_key=os.getenv("OPEN_AI_KEY"))

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

def get_real_time_selector(action_description, page):
    elements = page.query_selector_all("button, input, a, [role='button'], [role='link'], select, textarea")
    best_match = None
    highest_score = 0

    for element in elements:
        text = element.inner_text().strip() if element.inner_text() else ""
        href = element.get_attribute("href")
        placeholder = element.get_attribute("placeholder")
        aria_label = element.get_attribute("aria-label")
        class_name = element.get_attribute("class")

        match_score = 0
        if href and action_description.lower() in href.lower():
            match_score += 15
        elif text and action_description.lower() in text.lower():
            match_score += 10
        elif placeholder and action_description.lower() in placeholder.lower():
            match_score += 8
        elif aria_label and action_description.lower() in aria_label.lower():
            match_score += 6
        elif class_name:
            match_score += 4

        if match_score > highest_score:
            highest_score = match_score
            if href:
                best_match = f"a[href='{href}']"
            elif text:
                best_match = f"text={text}"
            elif placeholder:
                best_match = f"[placeholder='{placeholder}']"
            elif aria_label:
                best_match = f"[aria-label='{aria_label}']"
            elif class_name:
                best_match = f".{class_name.split()[0]}"

    return best_match if best_match else None  

with open("cypress_patterns.json", "r", encoding="utf-8") as f:
    cypress_patterns = json.load(f)

def generate_playwright_code_live(command):
    cypress_training_data = json.dumps(cypress_patterns, indent=2)
    prompt = f"""
    Convert the following user command into Playwright automation steps.
    --- Extracted Selectors ---
    {cypress_training_data}
    -- User Command --
    "{command}"
    Return JSON output only.
    """

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )

    raw_text = response.choices[0].message.content.strip()
    test_case_json = json.loads(raw_text)

    for step in test_case_json.get("steps", []):
        if "step" not in step or not step["step"].strip():
            step["step"] = f"Perform {step['action']} on {step.get('selector', 'element')}"

    return test_case_json.get("steps", [])

def execute_playwright_commands(magic_link, commands):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        page.goto(magic_link)
        time.sleep(2)

        for step in commands:
            if not isinstance(step, dict):
                continue  

            action = step.get("action", "").strip()
            element_name = step.get("step", "").strip()
            selector = step.get("selector", "").strip()

            if selector == "dynamic":
                real_time_selector = get_real_time_selector(element_name, page)
                if real_time_selector:
                    selector = real_time_selector
                else:
                    continue  

            try:
                if action == "click":
                    page.locator(selector).click()
                elif action == "wait_for":
                    page.wait_for_selector(selector)
                elif action == "fill":
                    input_text = step.get("value", "test-data")
                    page.locator(selector).fill(input_text)

                time.sleep(1)  

            except Exception:
                pass

        browser.close()

def main():
    user_command = input("Enter a command: ")
    
    magic_link = get_magic_link()
    if not magic_link:
        return

    steps = generate_playwright_code_live(user_command)
    
    if steps:
        execute_playwright_commands(magic_link, steps)

if __name__ == "__main__":
    main()
