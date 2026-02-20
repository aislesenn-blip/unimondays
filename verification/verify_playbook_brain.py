from playwright.sync_api import Page, expect, sync_playwright
import time

def test_playbook_brain(page: Page):
    print("Starting verification...")
    # 1. Login
    try:
        page.goto("http://localhost:5174/login")
        print("Navigated to Login")

        # Step 1: Role (Default Student) -> Next
        page.get_by_text("Next Step").click()
        print("Clicked Next Step")

        # Step 2: University -> Select UDSM -> Next
        page.locator("select").select_option("UDSM")
        page.get_by_text("Next").click()
        print("Selected University and Clicked Next")

        # Step 3: Credentials -> Fill -> Login
        page.get_by_placeholder("+255 700 000 000").fill("0700000000")
        page.get_by_placeholder("Enter OTP (Simulated)").fill("123")
        page.get_by_role("button", name="Login").click()
        print("Clicked Login")

        # Wait for navigation to Home
        page.wait_for_selector("text=Essentials", timeout=15000)
        print("Logged in successfully")

    except Exception as e:
        print(f"Login failed: {e}")
        page.screenshot(path="verification/login_fail.png")
        raise e

    # 2. Navigate to Playbook
    page.goto("http://localhost:5174/playbook")
    print("Navigated to Playbook")

    # 3. Select Offline Brain Mode
    page.get_by_text("Offline Brain").click()
    print("Selected Offline Brain Mode")

    # 4. Check Download Screen
    expect(page.get_by_role("heading", name="Playbook Brain")).to_be_visible()
    expect(page.get_by_text("Download Engine (~250MB)")).to_be_visible()
    print("Verified Download Screen")

    # 5. Simulate Download (Can't easily simulate web worker progress in headless, but clicking should trigger state)
    # We won't actually wait for 300MB download, just verify button click changes state if possible.
    # The worker logic is running in browser context.

    # Screenshot
    page.screenshot(path="verification/playbook_brain.png", full_page=True)
    print("Screenshot saved to verification/playbook_brain.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        try:
            test_playbook_brain(page)
        except Exception as e:
            print(f"Test failed: {e}")
        finally:
            browser.close()
