from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Simulate Lecturer View - Set Appeal Window
        # Note: We can't easily mock the full auth flow here without a running server and seeded DB.
        # However, we can test the UI components if we can render them.
        # Since we are in a dev environment without a full seed, we might need to rely on unit tests or
        # assume the components render if the server starts.

        # Ideally, we would navigate to a class page, open settings, and toggle appeals.
        # For now, let's try to hit the page and see if it loads without crashing.

        try:
            print("Navigating to home...")
            page.goto("http://localhost:3000")
            page.wait_for_load_state("networkidle")
            page.screenshot(path="verification/home_page.png")
            print("Home page screenshot taken.")

        except Exception as e:
            print(f"Error: {e}")

        browser.close()

if __name__ == "__main__":
    run()
