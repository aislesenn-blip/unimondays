from playwright.sync_api import Page, expect, sync_playwright
import time

def test_playbook_pivot(page: Page):
    # Handle alerts
    page.on("dialog", lambda d: print(f"Dialog: {d.message}") or d.accept())

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
        # page.wait_for_url("**/home", timeout=10000)
        # Using explicit wait for content on home page as wait_for_url can be flaky with redirects
        page.wait_for_selector("text=Essentials", timeout=15000)
        print("Logged in successfully")

    except Exception as e:
        print(f"Login failed: {e}")
        page.screenshot(path="verification/login_fail.png")
        raise e

    # 2. Navigate to Playbook
    page.goto("http://localhost:5173/playbook")
    print("Navigated to Playbook")

    # Wait for Editor
    editor = page.locator("[contenteditable='true']")
    editor.wait_for(state="visible", timeout=10000)
    print("Editor is visible")

    # 3. Interact with Editor
    # editor.click() # Focus
    # content = "Introduction\nThis is a test document for Playbook Pro."
    # page.keyboard.type(content)
    # print("Typed content")

    # 4. Insert Cover Page
    # The 'Cover' button is in the bottom bar.
    # We might need to handle hover or just click. It's a button.
    page.get_by_text("Cover").click()
    print("Clicked Cover button")

    # Modal should appear
    page.get_by_placeholder("e.g. History of Architecture").fill("CS 101 Finals")
    page.get_by_placeholder("e.g. John Doe").fill("Test Student")
    page.get_by_placeholder("e.g. 2023-04-001").fill("REG-001")
    page.get_by_placeholder("e.g. CS 101").fill("CS101")

    page.get_by_role("button", name="Generate Cover").click()
    print("Generated Cover Page")

    # Verify content in editor
    expect(page.get_by_text("CS 101 Finals")).to_be_visible()
    expect(page.get_by_text("Test Student")).to_be_visible()

    # 5. Insert TOC
    # The headings from Cover Page (CS101, CS 101 Finals) are H1/H2
    page.get_by_text("TOC").click()
    print("Clicked TOC button")

    # Verify TOC
    expect(page.get_by_text("Table of Contents")).to_be_visible()
    # It appears twice: once in cover page header, once in TOC list
    expect(page.get_by_text("CS 101 Finals")).to_have_count(2)

    # 6. Change Format to APA
    # Format button triggers hover menu.
    # Hover over 'Format'
    page.get_by_text("Format").hover()
    time.sleep(0.5) # Wait for animation
    page.get_by_text("APA Style").click()
    print("Changed to APA Style")

    # 7. Screenshot
    time.sleep(1) # Let styles apply
    page.screenshot(path="verification/playbook_pro.png", full_page=True)
    print("Screenshot saved to verification/playbook_pro.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        try:
            test_playbook_pivot(page)
        except Exception as e:
            print(f"Test failed: {e}")
        finally:
            browser.close()
