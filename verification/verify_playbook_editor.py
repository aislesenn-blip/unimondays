from playwright.sync_api import Page, expect, sync_playwright
import time

def test_playbook_editor(page: Page):
    print("Starting verification: Playbook Editor")

    # Capture console logs
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
    page.on("pageerror", lambda err: print(f"BROWSER ERROR: {err}"))

    # 1. Login
    page.goto("http://localhost:5173/login") # Note: Port might be 5173 based on logs
    # Quick login flow
    try:
        if page.get_by_text("Next Step").is_visible(timeout=3000):
            page.get_by_text("Next Step").click()
            page.locator("select").select_option("UDSM")
            page.get_by_text("Next").click()
            page.get_by_placeholder("+255 700 000 000").fill("0700000000")
            page.get_by_placeholder("Enter OTP (Simulated)").fill("123")
            page.get_by_role("button", name="Login").click()
            page.wait_for_selector("text=Essentials", timeout=15000)
        print("Logged in")
    except Exception as e:
        print(f"Login skip or error: {e}")

    # 2. Navigate to Playbook
    # Use the port from the logs if possible, but standard is 5173. The log said "Port 5173 is in use... Local: http://localhost:5173/".
    # I should use 5173.
    page.goto("http://localhost:5173/playbook")
    print("Navigated to Playbook")

    # 3. Check UI Elements
    expect(page.get_by_text("Untitled Document")).to_be_visible(timeout=10000)
    expect(page.get_by_text("Cover Page")).to_be_visible()
    expect(page.get_by_text("Table of Contents")).to_be_visible()

    # 4. Check Canvas
    canvas = page.locator("#canvas-container [contenteditable]")
    expect(canvas).to_be_visible()
    print("Canvas Verified")

    # 5. Type in Canvas
    canvas.click()
    page.keyboard.type("This is a test document for Playbook Editor.")
    expect(page.get_by_text("This is a test document for Playbook Editor.")).to_be_visible()
    print("Typing Verified")

    # 6. Test Cover Page Modal
    page.get_by_text("Cover Page").click()
    expect(page.get_by_text("Add Smart Cover Page")).to_be_visible()
    page.get_by_role("button", name="Generate Cover").click()
    expect(page.get_by_text("University of Dar es Salaam")).to_be_visible()
    print("Cover Page Verified")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        try:
            test_playbook_editor(page)
        except Exception as e:
            print(f"Test failed: {e}")
        finally:
            browser.close()
