from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_features(page: Page):
    # 1. Landing Page & Contact Check
    print("Navigating to Landing Page...")
    page.goto("http://localhost:3000")

    # Check Contact Number in Footer
    print("Checking Footer Contact...")
    footer = page.locator("footer")
    expect(footer).to_contain_text("0745780988")
    print("✓ Contact number verified.")

    # Check Partnerships (Mzumbe, UDOM)
    expect(page.get_by_text("Mzumbe University")).to_be_visible()
    expect(page.get_by_text("UDOM")).to_be_visible()
    print("✓ Partnerships verified.")

    # 2. Privacy Policy Page
    print("Navigating to Privacy Page...")
    # Click the "Read Full Policy" button
    page.get_by_role("link", name="Read Full Policy").click()
    expect(page).to_have_url("http://localhost:3000/privacy")
    expect(page.get_by_role("heading", name="Privacy Policy")).to_be_visible()
    print("✓ Privacy Page verified.")

    # 3. Group Management (Manual Selection)
    print("Navigating to Dashboard Session...")
    page.goto("http://localhost:3000/dashboard/sessions/1")

    # Check URL to see if redirected
    print(f"Current URL: {page.url}")
    if "/login" in page.url:
        print("Redirected to login page. Cannot verify dashboard.")
        page.screenshot(path="verification/login_redirect.png")
        return

    # Click Groups Tab
    print("Clicking Groups Tab...")
    try:
        # Try generic text match as fallback
        page.locator("button", has_text="Groups").click(timeout=5000)
    except Exception as e:
        print(f"Could not click Groups tab: {e}")
        page.screenshot(path="verification/error_groups.png")
        return

    # Wait for Group Management to appear
    try:
        expect(page.get_by_text("Group Management")).to_be_visible(timeout=5000)
    except:
        print("Group Management header not found")
        page.screenshot(path="verification/error_group_mgmt_header.png")
        return

    # Select "Manual Selection"
    # Note: The Select component uses native <select> now
    print("Selecting Manual Selection...")
    try:
        # Locate the Select by looking for the Label "Grouping Method"
        # The select should be nearby.
        # Since I used standard <select>, it is user visible if I click it? No, standard select on desktop often requires click to open options?
        # No, page.select_option usually works on <select> directly without clicking.

        # Find the select element inside the card
        # Structure: Label -> Select
        page.locator("select").first.select_option("manual")
    except Exception as e:
        print(f"Could not select Manual Selection: {e}")
        page.screenshot(path="verification/error_select.png")
        return

    # Check for "Unassigned" list
    try:
        expect(page.get_by_text("Unassigned (")).to_be_visible(timeout=5000)
        expect(page.get_by_role("button", name="Create New Group")).to_be_visible()
        print("✓ Manual Selection UI verified.")
    except Exception as e:
        print(f"Manual selection UI check failed: {e}")
        page.screenshot(path="verification/error_manual_ui.png")
        return

    # Take Screenshot
    time.sleep(1) # wait for animations
    page.screenshot(path="verification/verification.png")
    print("✓ Screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_features(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/fatal_error.png")
        finally:
            browser.close()
