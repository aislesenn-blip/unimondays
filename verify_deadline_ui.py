from playwright.sync_api import sync_playwright

def verify_deadline_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Try to visit the dashboard (Create Work Session is likely here)
            # If not logged in, it will likely redirect to login.
            # I can't verify the tooltip without logging in, but I can check if the page loads.
            print("Navigating to dashboard...")
            page.goto("http://localhost:3000/dashboard", timeout=60000)

            # Take screenshot to see where we landed
            page.screenshot(path="verification_deadline_ui.png")
            print("Screenshot saved to verification_deadline_ui.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_deadline_ui()
