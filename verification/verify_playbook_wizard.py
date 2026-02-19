from playwright.sync_api import Page, expect, sync_playwright
import time

def test_playbook_wizard(page: Page):
    print("Starting verification...")
    # 1. Login
    try:
        page.goto("http://localhost:5173/login")
        print("Navigated to Login")

        # Step 1: Role (Default Student) -> Next
        # Assuming role selection is default student, just click Next
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
    page.goto("http://localhost:5173/playbook")
    print("Navigated to Playbook")

    # 3. Ingestion Step
    expect(page.get_by_text("Ingest Content")).to_be_visible()

    # Fill Text Area
    page.locator("textarea").fill("This is a test document content for Playbook Wizard.\n\nChapter 1\nIntroduction...")
    print("Filled Text Area")

    # Click Next
    page.get_by_text("Next: Configure Document").click()
    print("Clicked Next")

    # 4. Metadata Step
    expect(page.get_by_text("Document Metadata")).to_be_visible()

    # Fill Form
    page.get_by_placeholder("e.g. Ernest K.").fill("Test Student")
    page.get_by_placeholder("e.g. 2023-04-001").fill("REG-001")
    page.get_by_placeholder("e.g. CS 101").fill("CS101")
    page.get_by_placeholder("e.g. Dr. M").fill("Dr. Smith")
    page.get_by_placeholder("e.g. Final Project Report").fill("Final Report")
    print("Filled Metadata")

    # Select Style (Formal)
    page.get_by_text("Formal Report").click()
    print("Selected Formal Report")

    # Click Generate
    page.get_by_text("Generate Document").click()
    print("Clicked Generate")

    # 5. Generation View
    # Wait for completion
    page.wait_for_selector("text=Document Ready", timeout=10000)
    print("Generation Complete")

    expect(page.get_by_text("Download PDF")).to_be_visible()
    expect(page.get_by_text("Send to UniMonday Print")).to_be_visible()

    # Screenshot
    page.screenshot(path="verification/playbook_wizard.png", full_page=True)
    print("Screenshot saved to verification/playbook_wizard.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        try:
            test_playbook_wizard(page)
        except Exception as e:
            print(f"Test failed: {e}")
        finally:
            browser.close()
