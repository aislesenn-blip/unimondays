import requests
import time
from pypdf import PdfWriter
import io
import time

BASE_URL = "http://localhost:8000"

def create_dummy_pdf():
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    output = io.BytesIO()
    writer.write(output)
    output.seek(0)
    return output

def verify():
    print("Verifying Playbook Ecosystem...")

    # 1. Check Root
    try:
        res = requests.get(f"{BASE_URL}/")
        assert res.status_code == 200
        print("Backend is running.")
    except Exception as e:
        print(f"Backend not running: {e}")
        return

    # 2. Upload PDF
    pdf_file = create_dummy_pdf()
    files = {'file': ('test.pdf', pdf_file, 'application/pdf')}

    print("Uploading PDF...")
    res = requests.post(f"{BASE_URL}/api/upload", files=files)

    if res.status_code == 200:
        data = res.json()
        print(f"Upload Success: {data}")
        print("Waiting for background processing...")
        time.sleep(5)

        # 3. Check Results
        res = requests.get(f"{BASE_URL}/api/results")
        results = res.json()
        print(f"Results Found: {len(results)}")
        if results:
            print(f"Sample: {results[0]}")

        # 4. Chat
        print("Testing Chat...")
        res = requests.post(f"{BASE_URL}/api/chat", params={"query": "Who failed?"})
        print(f"Chat Response: {res.json()}")

    else:
        print(f"Upload Failed: {res.text}")

if __name__ == "__main__":
    verify()
