from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        try:
            print("Navigating to Login...")
            page.goto("http://localhost:3000/login")
            page.wait_for_selector("text=OSPREY", timeout=5000)

            # Click quick login for STAFF
            # The button contains text "STAFF" and "Dr. Jules (Lecturer)"
            # Let's target by text "STAFF"
            print("Logging in as Staff...")
            page.click("text=STAFF")

            # Wait for dashboard load
            page.wait_for_url("**/dashboard/staff", timeout=5000)
            print("Staff Dashboard Loaded")

            # Now go to Requests page to create request?
            # Or use "New Request" button on dashboard if it exists?
            # StaffDashboard has "New Request" button in header:
            # <Button> <PlusCircle className="mr-2 h-4 w-4" /> New Request </Button>

            print("Clicking New Request on Dashboard...")
            page.click("text=New Request")

            # Wait for modal?
            # Wait, StaffDashboard creates request via... wait.
            # In StaffDashboard.tsx:
            # <Button> <PlusCircle ... /> New Request </Button>
            # But where does it go?
            # It just has <Button>New Request</Button> but no onClick handler!
            # Ah! I missed the onClick handler in StaffDashboard.tsx!

            print("Wait! StaffDashboard button creates nothing?")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_screenshot.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
