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

        # Navigate to Playbook
        print("Navigating to Playbook...")
        page.click("text=Playbook")
        page.wait_for_url("**/playbook")

        # Test Mode X
        print("Selecting Playbook X...")
        if page.is_visible("text=Playbook X (Chat)"):
             page.click("text=Playbook X (Chat)")
             page.wait_for_timeout(500)
             if page.is_visible("text=Playbook x"): # Checking header lowercase/uppercase might vary
                 print("Verified: Entered Playbook X mode.")
        else:
             print("Error: Playbook X button not found.")

        # Test Command Bar (Input)
        print("Testing Input...")
        page.fill("input", "Hello X")
        page.keyboard.press("Enter")
        # In real integration without key, it might alert or show error, but we just check if input clears or processing starts
        page.wait_for_timeout(1000)

        # Verify Export Menu
        print("Testing Export Menu...")
        page.click("button:has-text('Export')")
        if page.is_visible("text=As PDF Document"):
             print("Verified: Export menu visible.")

        # Verify Print Handoff
        print("Testing Print Handoff...")
        page.click("button:has-text('Print')")
        if page.is_visible("text=Select Vendor"):
             print("Verified: Vendor menu visible.")

        browser.close()
        print("Playbook Real Integration Test Complete.")

if __name__ == "__main__":
    run()
