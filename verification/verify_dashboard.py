from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print("Navigating to Dashboard...")
        try:
            page.goto("http://localhost:3000/dashboard", timeout=30000)

            # Wait for content to load
            print("Waiting for page load...")
            page.wait_for_selector("h1:has-text('Playbook Dashboard')")

            # Check for HOD Summary
            print("Checking HOD Summary...")
            try:
                # Wait for content to replace loader
                page.wait_for_selector("text=EXECUTIVE SUMMARY", timeout=10000)
                print("Found HOD Summary Section.")
            except:
                print("HOD Summary Section not found in time (might still be generating).")

            # Check Buttons
            print("Checking Buttons...")
            if page.locator("button:has-text('Excel')").is_visible():
                print("Found Excel Button.")
            else:
                print("Missing Excel Button.")

            if page.locator("button:has-text('PDF Report')").is_visible():
                print("Found PDF Report Button.")
            else:
                print("Missing PDF Report Button.")

            # Check Table
            print("Checking Results Table...")
            try:
                page.wait_for_selector("table", timeout=5000)
                headers = page.locator("th").all_text_contents()
                print("Table Headers:", headers)
                if "Reg No" in headers and "Status" in headers:
                    print("Table Headers Valid.")
                else:
                    print("Table Headers Invalid.")
            except:
                print("Table not found.")

            # Screenshot
            path = "verification/dashboard_screenshot.png"
            page.screenshot(path=path)
            print(f"Screenshot saved to {path}")

        except Exception as e:
            print(f"Verification Failed: {e}")
            page.screenshot(path="verification/error_screenshot.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
