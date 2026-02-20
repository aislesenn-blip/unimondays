from playwright.sync_api import Page, expect, sync_playwright
import time

def test_playbook_ecosystem(page: Page):
    print("Starting verification: Playbook Ecosystem")

    page.on("dialog", lambda dialog: print(f"Dialog opened: {dialog.message}"))
    page.on("console", lambda msg: print(f"Console: {msg.text}"))

    # 1. Login
    page.goto("http://localhost:5173/login")
    try:
        # Check if we are already logged in or need to go through onboarding
        if page.get_by_text("Next Step").is_visible(timeout=3000):
            print("Going through onboarding...")
            page.get_by_text("Next Step").click()
            page.locator("select").select_option("UDSM")
            page.get_by_text("Next").click()
            page.get_by_placeholder("+255 700 000 000").fill("0700000000")
            page.get_by_placeholder("Enter OTP (Simulated)").fill("123")
            page.get_by_role("button", name="Login").click()
            page.wait_for_selector("text=Essentials", timeout=15000)
    except Exception as e:
        print(f"Login skip/error: {e}")
        pass

    print("Logged in")

    # 2. Navigate to Playbook
    page.goto("http://localhost:5173/playbook")
    print("Navigated to Playbook")

    # 3. Verify Playbook Hub
    # Check for the new Hub Header
    expect(page.get_by_text("Create. Automate. Done.")).to_be_visible()

    # Check for the two cards
    expect(page.get_by_text("Playbook Pro", exact=False).first).to_be_visible()
    expect(page.get_by_text("Playbook X", exact=False).first).to_be_visible()
    print("Hub Verified")

    # 4. Click Playbook X Card
    # We can select by text inside the card
    print("Clicking Playbook X...")
    # Using a more specific selector to avoid the header
    page.locator(".group").filter(has_text="Playbook X").click()

    # 5. Verify Playbook X Interface
    expect(page.get_by_text("Text-to-PPTX")).to_be_visible()

    # Check for new placeholder text/rules
    textarea = page.locator("textarea")
    expect(textarea).to_be_visible()
    placeholder = textarea.get_attribute("placeholder")
    if "Heading 1 = New Slide" in placeholder or "# Slide Title" in placeholder:
        print("New Placeholder Verified")
    else:
        print(f"Warning: Placeholder text mismatch: {placeholder}")

    # 6. Generate Slides
    print("Clicking Generate...")
    # The button text changed to "GENERATE SLIDES"
    page.get_by_role("button", name="GENERATE SLIDES").click()

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
            page.screenshot(path="verification/failure.png")
        finally:
            browser.close()
