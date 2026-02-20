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
            page.wait_for_selector("text=OSPREY")
            page.screenshot(path="verification/01_login.png")

            print("Logging in as Staff...")
            page.click("text=STAFF")
            page.wait_for_url("**/dashboard/staff")
            time.sleep(1)
            page.screenshot(path="verification/02_staff_dashboard.png")

            print("Navigating to Requests via Dashboard Button...")
            # Click "New Request" on dashboard
            page.click("text=New Request")
            page.wait_for_url("**/requests")
            time.sleep(1)

            # Now on Requests page, click "New Request" again to open modal
            print("Opening Request Modal...")
            page.click("button:has-text('New Request')")
            page.wait_for_selector("text=Submit New Request")
            time.sleep(0.5)

            print("Filling Request Form...")
            page.fill("input[placeholder='e.g. Medical Leave for 3 Days']", "Urgent Medical Leave")
            page.fill("textarea", "Need 2 days off.")
            page.click("text=Submit Request")
            time.sleep(1)

            print("Screenshotting Requests Page...")
            page.screenshot(path="verification/03_staff_requests.png")

            print("Logging out...")
            page.locator("header button").last.click()
            page.wait_for_url("**/login")
            time.sleep(1)

            print("Logging in as HOD...")
            page.click("text=HOD")
            page.wait_for_url("**/dashboard/hod")
            time.sleep(1)
            page.screenshot(path="verification/04_hod_dashboard.png")

            print("Approving Request...")
            # In HOD Dashboard, there is a table with pending requests
            # Wait for the row to appear
            page.wait_for_selector("tr:has-text('Urgent Medical Leave')")
            row = page.locator("tr", has_text="Urgent Medical Leave")

            # Click the approve button (check circle)
            # Find the button inside the row
            row.locator("button[title='Approve']").click()
            time.sleep(1)

            page.screenshot(path="verification/05_hod_approved.png")

            print("Done.")
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
