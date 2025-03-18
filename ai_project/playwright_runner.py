import subprocess
import tempfile
import os

def execute_generated_script(playwright_script):
    """
    Executes a Playwright test script generated from AI.

    :param playwright_script: Python code as a string
    """
    
    # ✅ Create a temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".py") as temp_file:
        temp_file.write(playwright_script.encode("utf-8"))
        temp_file_path = temp_file.name

    try:
        print(f"🚀 Running Playwright Test: {temp_file_path}")
        subprocess.run(["/usr/bin/python3", temp_file_path], check=True)
        print("✅ Playwright Test Completed!")

    except subprocess.CalledProcessError as e:
        print(f"❌ Playwright Execution Failed: {e}")

    finally:
        os.remove(temp_file_path)  # Cleanup after execution
