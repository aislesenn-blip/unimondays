from playwright.sync_api import Page, expect, sync_playwright
import time

def test_playbook_ecosystem(page: Page):
    print("Starting verification: Playbook Ecosystem")

    # 1. Login
    page.goto("http://localhost:5173/login")
    try:
        if page.get_by_text("Next Step").is_visible(timeout=3000):
            page.get_by_text("Next Step").click()
            page.locator("select").select_option("UDSM")
            page.get_by_text("Next").click()
            page.get_by_placeholder("+255 700 000 000").fill("0700000000")
            page.get_by_placeholder("Enter OTP (Simulated)").fill("123")
            page.get_by_role("button", name="Login").click()
            page.wait_for_selector("text=Essentials", timeout=15000)
    except:
        pass
    print("Logged in")

    # 2. Navigate to Playbook
    page.goto("http://localhost:5173/playbook")
    print("Navigated to Playbook")

    # 3. Verify Playbook Pro (Default Mode)
    expect(page.get_by_text("Document Formatter")).to_be_visible()

    # 4. Switch to Slides X
    page.get_by_role("button", name="Slides X").click()
    expect(page.get_by_text("Text-to-PPTX")).to_be_visible()

    # 5. Generate (Mock)
    textarea = page.locator("textarea")
    expect(textarea).to_be_visible()

    print("Clicking Generate...")
    page.get_by_role("button", name="GENERATE PPT").click()

    # Check for Generating state
    expect(page.get_by_text("Building Slides...")).to_be_visible(timeout=2000)
    print("Generating State Visible")

    # Check for Success
    expect(page.get_by_role("button", name="DOWNLOAD .PPTX")).to_be_visible(timeout=10000)
    print("PPT Generation Success")

    page.screenshot(path="verification/playbook_ecosystem.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        try:
            test_playbook_ecosystem(page)
        except Exception as e:
            print(f"Test failed: {e}")
        finally:
            browser.close()
