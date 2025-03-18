import os
import json
import requests
import re
import time
from dotenv import load_dotenv
from mailosaur import MailosaurClient
from mailosaur.models import SearchCriteria
import boto3

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
    MAILOSAUR_API_KEY = os.getenv("MAILOSAUR_API_KEY")  
    MAILOSAUR_SERVER_ID = os.getenv("MAILOSAUR_SERVER_ID")  
    API_TOKEN = os.getenv("API_TOKEN")
else:
    MAILOSAUR_API_KEY = get_secret("/app/MAILOSAUR_API_KEY")
    MAILOSAUR_SERVER_ID = get_secret("/app/MAILOSAUR_SERVER_ID")
    API_TOKEN = get_secret("/app/API_TOKEN")
    
LOGIN_EMAIL = "test@example.com"

API_BASE_URL = "https://example.com"
AUTH_API_URL = f"{API_BASE_URL}/api/v1/auth/"

mailosaur = MailosaurClient(MAILOSAUR_API_KEY)

def delete_all_messages():
    try:
        mailosaur.messages.delete_all(MAILOSAUR_SERVER_ID)
    except Exception:
        pass

def send_magic_link_request():
    headers = {
        "Authorization": f"Token {API_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "username": LOGIN_EMAIL,
        "mfa_type": "magic_link"
    }

    response = requests.post(AUTH_API_URL, json=payload, headers=headers)
    return response.status_code == 200

def retrieve_magic_link():
    try: 
        criteria = SearchCriteria()
        criteria.sent_to = LOGIN_EMAIL
        
        message = mailosaur.messages.get(
            MAILOSAUR_SERVER_ID,
            criteria,
            timeout=60000
        )

        magic_link_regex = r"https:\/\/example\.com\/login\?token=[a-zA-Z0-9]+"
        match = re.search(magic_link_regex, message.html.body)

        return match.group(0) if match else None

    except Exception:
        return None
    
delete_all_messages()
send_magic_link_request()
retrieve_magic_link()
