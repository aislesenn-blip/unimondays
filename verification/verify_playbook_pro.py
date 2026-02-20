from playwright.sync_api import Page, expect, sync_playwright
import time

def test_playbook_pro(page: Page):
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

    # 3. Check Initial Brain Screen (Download Engine)
    # Using more specific selector for the header
    expect(page.get_by_role("heading", name="Playbook Pro", exact=True)).to_be_visible()
    expect(page.get_by_text("Download Engine (~250MB)")).to_be_visible()
    print("Verified Download Screen")

    # 4. Simulate Download Interaction (Click Download)
    page.get_by_text("Download Engine").click()
    print("Clicked Download Engine")

    # Check status change
    expect(page.get_by_text("Initiating secure download...")).to_be_visible()
    print("Download initiated")

    # Screenshot
    page.screenshot(path="verification/playbook_pro_final.png", full_page=True)
    print("Screenshot saved to verification/playbook_pro_final.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        try:
            test_playbook_pro(page)
        except Exception as e:
            print(f"Test failed: {e}")
        finally:
            browser.close()
