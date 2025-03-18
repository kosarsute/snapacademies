import streamlit as st
import requests
import base64
import os
import re
import boto3
import json
from dotenv import load_dotenv
from openai import OpenAI
from playwright_runner import execute_generated_script
from generator import generate_playwright_code
from playwright_script import get_magic_link, generate_playwright_code_live, execute_playwright_commands

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
    JIRA_EMAIL = os.getenv("JIRA_EMAIL")
    JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN")
    QASE_API_TOKEN = os.getenv("QASE_API_TOKEN")
else:
    OPENAI_API_KEY = get_secret("/app/OPENAI_API_KEY")
    JIRA_EMAIL = get_secret("/app/JIRA_EMAIL")
    JIRA_API_TOKEN = get_secret("/app/JIRA_API_TOKEN")
    QASE_API_TOKEN = get_secret("/app/QASE_API_TOKEN")

client = OpenAI(api_key=OPENAI_API_KEY)

with open("cypress_patterns.json", "r", encoding="utf-8") as f:
    cypress_patterns = json.load(f)

JIRA_DOMAIN = "example.atlassian.net"
QASE_PROJECT_CODE = "EXAMPLE"

JIRA_API_URL = f"https://{JIRA_DOMAIN}/rest/api/3/issue"
auth = base64.b64encode(f"{JIRA_EMAIL}:{JIRA_API_TOKEN}".encode()).decode()
headers = {
    "Authorization": f"Basic {auth}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

JIRA_CUSTOM_FIELD_ID = "customfield_12345"

if "jira_details" not in st.session_state:
    st.session_state["jira_details"] = None

if "test_case" not in st.session_state:
    st.session_state["test_case"] = None

def get_jira_ticket(ticket_number):
    response = requests.get(f"{JIRA_API_URL}/{ticket_number}", headers=headers)

    if response.status_code == 200:
        issue_data = response.json()
        fields = issue_data.get("fields", {})

        structured_data = {
            "summary": fields.get("summary", ""),
            "priority": fields.get("priority", {}).get("name", ""),
            "status": fields.get("status", {}).get("name", ""),
            "assignee": fields.get("assignee", {}).get("displayName", ""),
            "reporter": fields.get("creator", {}).get("displayName", ""),
            "full_description": fields.get("description", {}).get("content", []),
            "comments": fields.get("comment", {}).get("comments", []),
            "attachments": fields.get("attachment", [])
        }
        return structured_data
    return None

def generate_test_case(jira_details):
    try:
        prompt = f"""
        Generate a structured test case based on the following Jira details:
        Summary: {jira_details.get('summary', '')}
        Description: {jira_details.get('full_description', '')}
        Return JSON output only.
        """

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}]
        )

        raw_text = response.choices[0].message.content.strip()
        test_case_json = json.loads(raw_text)
        return test_case_json, test_case_json.get("playwright_steps", [])

    except Exception:
        return {"title": "Error", "description": "Invalid AI response", "steps": [], "playwright_steps": []}, []

def upload_to_qase(test_case_json):
    qase_url = f"https://api.qase.io/v1/case/{QASE_PROJECT_CODE}"
    headers = {"Token": QASE_API_TOKEN, "Content-Type": "application/json"}

    if not test_case_json:
        return None

    qase_payload = {
        "title": test_case_json["title"],
        "description": test_case_json.get("description", ""),
        "priority": 0,
        "steps": [{"position": step["position"], "action": step["action"], "expected_result": step["expected_result"]} for step in test_case_json.get("steps", [])]
    }

    response = requests.post(qase_url, json=qase_payload, headers=headers)

    if response.status_code == 200:
        return response.json()["result"]["id"]
    return None

def update_jira_with_edge_cases(ticket_number, edge_cases, qase_link):
    jira_update_url = f"{JIRA_API_URL}/{ticket_number}"
    payload = {"fields": {JIRA_CUSTOM_FIELD_ID: edge_cases + f"\n🔗 Qase Test Case: {qase_link}"}}
    response = requests.put(jira_update_url, json=payload, headers=headers)
    return response.status_code == 204

st.set_page_config(page_title="Jira AI Automation", layout="wide")

st.title("📌 AI-Powered QA Automation")

tab1, tab2 = st.tabs(["🔍 Jira Ticket", "🚀 AI Prompt"])

with tab1:
    st.header("🔍 Fetch Jira Ticket")
    ticket_number = st.text_input("Enter Jira Ticket Number")

    if st.button("Fetch Jira Ticket"):
        ticket_details = get_jira_ticket(ticket_number)

        if ticket_details:
            st.session_state["jira_details"] = ticket_details
            st.success("✅ Jira Ticket Fetched!")
            st.write(f"**Summary:** {ticket_details['summary']}")
            st.write(f"**Priority:** {ticket_details['priority']}")
            st.write(f"**Status:** {ticket_details['status']}")
            st.write(f"**Assignee:** {ticket_details['assignee']}")
            st.write(f"**Reporter:** {ticket_details['reporter']}")
            st.write("### Description")
            st.write(ticket_details["full_description"])

    if "jira_details" in st.session_state:
        if st.button("Generate Test Case"):
            test_case, playwright_steps = generate_test_case(st.session_state["jira_details"])
            st.session_state["generated_test_case"] = test_case
            st.session_state["playwright_steps"] = playwright_steps
            st.success("✅ Test Case Generated!")
            st.json(test_case)

    if "generated_test_case" in st.session_state:
        if st.button("Upload to Qase"):
            test_case = st.session_state["generated_test_case"]
            case_id = upload_to_qase(test_case)

            if case_id:
                qase_link = f"https://app.qase.io/case/{QASE_PROJECT_CODE}-{case_id}"
                st.session_state["qase_link"] = qase_link
                st.success(f"✅ Test Case Uploaded! [🔗 View in Qase]({qase_link})")

    if "qase_link" in st.session_state:
        if st.button("Update Jira with Edge Cases"):
            update_jira_with_edge_cases(ticket_number, test_case["edge_cases"], st.session_state["qase_link"])
            st.success("✅ Jira Ticket Updated!")

with tab2:
    st.title("🚀 AI Prompt")
    command_input = st.text_input("Enter a command")

    if st.button("Run Command"):
        if command_input:
            magic_link = get_magic_link()
            if not magic_link:
                st.error("❌ Failed to retrieve Magic Link.")
            else:
                st.success("✅ Successfully logged in.")
                steps = generate_playwright_code_live(command_input)
                if not steps:
                    st.error("❌ No valid steps generated.")
                else:
                    st.success("✅ Playwright Steps Generated.")
                    execute_playwright_commands(magic_link, steps)
                    st.success("✅ Test Execution Complete!")
