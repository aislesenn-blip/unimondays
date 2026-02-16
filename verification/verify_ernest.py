
from playwright.sync_api import sync_playwright
import time

def verify_ernest():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        try:
            print("Navigating to Login...")
            page.goto("http://localhost:3000/login")

            # Login as student
            page.click("text=Student")
            page.click("text=Next Step")
            page.select_option("select", "UDSM")
            page.click("button:has-text('Next')")
            page.fill("input[placeholder='+255 700 000 000']", "987654321")
            page.fill("input[type='password']", "123")
            page.click("button:has-text('Login')")

            page.wait_for_url("http://localhost:3000/")
            print("Logged in.")

            print("Navigating to Ernest...")
            page.goto("http://localhost:3000/ernest")
            page.wait_for_load_state("networkidle")

            # Check for new Tools
            print("Checking for Mini-Stationary Tools...")
            tools = ["Auto-Format", "Generate TOC", "Paraphrase", "To Word"]
            for tool in tools:
                if page.locator(f"text={tool}").first.is_visible():
                    print(f"SUCCESS: Tool '{tool}' found.")
                else:
                    print(f"FAILURE: Tool '{tool}' not found.")

            # Click 'To Word' to trigger mock export
            print("Testing 'To Word' interaction...")
            # We expect an alert. Playwright handles dialogs automatically but we can listen
            page.on("dialog", lambda dialog: print(f"Dialog: {dialog.message}") or dialog.accept())

            page.click("text=To Word")
            time.sleep(1)

            page.screenshot(path="verification/ernest_tools.png")
            print("Screenshot saved to verification/ernest_tools.png")

        except Exception as e:
            print(f"Verification Failed: {e}")
            page.screenshot(path="verification/error_ernest.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_ernest()
