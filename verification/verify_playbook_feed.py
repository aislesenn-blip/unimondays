from playwright.sync_api import Page, expect, sync_playwright
import time

def test_playbook_inspiration(page: Page):
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

    # 3. Check Onboarding
    expect(page.get_by_text("Mental Escape.")).to_be_visible()
    print("Onboarding Visible")

    # Select Interest (Technology)
    page.get_by_text("Technology").click()
    print("Selected Technology")

    # Click Dive In
    page.get_by_text("Dive In").click()
    print("Clicked Dive In")

    # 4. Check Feed
    # Wait for feed header - case sensitive usually, but interest ID 'tech' used for fetching
    # The header displays `interest` prop. If we clicked Technology (id: tech), it passes 'tech'
    # The header uppercases it: <h1 ... uppercase>{interest}</h1> -> TECH
    # Wait for "tech" or "TECH" specifically in the overlay
    expect(page.get_by_text("tech")).to_be_visible()
    print("Feed Loaded")

    # Wait for images (Unsplash)
    time.sleep(2)
    page.screenshot(path="verification/playbook_feed.png", full_page=True)
    print("Screenshot saved to verification/playbook_feed.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 414, "height": 896}) # Mobile view
        page = context.new_page()
        try:
            test_playbook_inspiration(page)
        except Exception as e:
            print(f"Test failed: {e}")
        finally:
            browser.close()
