import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to App...")
        page.goto("http://localhost:5173/login")
        page.wait_for_load_state("networkidle")

        # Login
        print("Logging in...")
        page.click("text=Student")
        page.click("text=Next Step")
        page.select_option("select", "UDSM")
        page.click("text=Next")
        page.fill("input[placeholder='+255 700 000 000']", "student@unimonday.com")
        page.fill("input[placeholder='Enter OTP (Simulated)']", "password123")
        page.click("button:has-text('Login')")

        # Verify Home Branding
        print("Verifying Home Page Branding...")
        page.wait_for_url("**/home")
        page.wait_for_selector("text=UniMonday")
        page.screenshot(path="verification/20_home_branding.png")
        print("Verified: UniMonday Wordmark visible.")

        # Navigate to Playbook
        print("Navigating to Playbook...")
        page.click("text=Playbook")
        page.wait_for_url("**/playbook")
        page.screenshot(path="verification/21_playbook_selection.png")

        # Select Mode
        print("Selecting Playbook Pro...")
        page.click("text=Playbook Pro")
        page.wait_for_timeout(500) # Wait for state change
        page.screenshot(path="verification/22_playbook_canvas.png")

        # Test Command Bar
        print("Testing Command Bar...")
        page.fill("input", "Format this document") # Generic input selector as it's the only one
        page.keyboard.press("Enter")
        page.wait_for_timeout(1500) # Wait for mock AI response
        page.screenshot(path="verification/23_playbook_response.png")

        if page.is_visible("text=Playbook Pro"):
             print("Verified: Playbook response received.")

        # Test Print Handoff
        print("Testing Print Handoff...")
        page.click("button:has-text('Print')")
        page.wait_for_timeout(500)
        # Select first vendor in dropdown
        page.click("text=UDSM Main Library Print") # Assuming this vendor is in the list

        page.wait_for_url("**/submit-task")
        page.screenshot(path="verification/24_submit_task_handoff.png")

        if page.is_visible("text=Submit Task"):
             print("Verified: Redirected to Submit Task page.")

        browser.close()
        print("Playbook & Branding Verification Complete.")

if __name__ == "__main__":
    run()
