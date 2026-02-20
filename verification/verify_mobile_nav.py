from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=True)
        # Use iPhone 12 Pro viewport
        context = browser.new_context(viewport={"width": 390, "height": 844}, user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1")
        page = context.new_page()

        try:
            print("Navigating to Login...")
            page.goto("http://localhost:5173/login")
            page.wait_for_selector("text=OSPREY")

            print("Logging in as Staff...")
            page.click("text=STAFF")
            page.wait_for_url("**/dashboard/staff")
            time.sleep(1)

            print("Verifying Sidebar is initially hidden...")
            # Backdrop should not exist or be hidden
            backdrop_count = page.locator(".fixed.inset-0.z-40.bg-slate-900\/50").count()
            if backdrop_count > 0:
                 if page.locator(".fixed.inset-0.z-40.bg-slate-900\/50").is_visible():
                     raise Exception("Backdrop should not be visible initially")

            # Click Hamburger Menu
            print("Clicking Hamburger Menu...")
            # The hamburger button is the first button in the header
            page.locator("header button").first.click()
            time.sleep(0.5)

            # Verify Sidebar is visible
            print("Verifying Sidebar is visible...")
            # Backdrop should be visible
            page.wait_for_selector(".fixed.inset-0.z-40.bg-slate-900\/50")

            # Take screenshot
            page.screenshot(path="verification/mobile_menu_open.png")

            # Click a link in sidebar (e.g., Requests)
            print("Clicking Requests link...")
            page.click("text=Requests")

            # Verify Sidebar closes
            print("Verifying Sidebar closes on navigation...")
            time.sleep(0.5)
            # Backdrop should be gone
            if page.locator(".fixed.inset-0.z-40.bg-slate-900\/50").is_visible():
                 raise Exception("Sidebar did not close after navigation")

            page.screenshot(path="verification/mobile_menu_closed_nav.png")

            # Open Sidebar again
            print("Opening Sidebar again...")
            page.locator("header button").first.click()
            time.sleep(0.5)

            # Click Backdrop to close
            print("Clicking Backdrop to close...")
            # Click explicitly outside the sidebar (sidebar width is 256px)
            # Viewport width is 390. Click at x=350, y=100
            page.click(".fixed.inset-0.z-40.bg-slate-900\/50", position={"x": 350, "y": 100})
            time.sleep(0.5)

            # Verify Sidebar closes
            print("Verifying Sidebar closes on backdrop click...")
            if page.locator(".fixed.inset-0.z-40.bg-slate-900\/50").is_visible():
                 raise Exception("Sidebar did not close after backdrop click")

            # Open Sidebar again to test Close button
            print("Opening Sidebar again...")
            page.locator("header button").first.click()
            time.sleep(0.5)

            # Click Close button (X)
            print("Clicking Close button...")
            page.locator("aside button").click()
            time.sleep(0.5)

             # Verify Sidebar closes
            print("Verifying Sidebar closes on Close button click...")
            if page.locator(".fixed.inset-0.z-40.bg-slate-900\/50").is_visible():
                 raise Exception("Sidebar did not close after close button click")


            print("Mobile Navigation Verification Passed!")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/mobile_error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    run()
