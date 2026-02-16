
from playwright.sync_api import sync_playwright
import time

def verify_ai_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        try:
            # 1. Login and Check Branding
            print("Navigating to Login...")
            page.goto("http://localhost:3000/login")
            page.wait_for_load_state("networkidle")

            # Check Branding Text by locator text content, not HTML source
            branding = page.locator("h1").first.text_content()
            print(f"Branding Text Found: {branding}")
            if "UniMonday" in branding or "UɴiMonday" in branding:
                 print("SUCCESS: Branding found on Login.")
            else:
                 print("FAILURE: Branding not found. Content: " + branding)

            # Login as Student (Standard User)
            print("Logging in...")
            if page.locator("text=Student").is_visible():
                page.click("text=Student")
                if page.locator("text=Next Step").is_visible():
                    page.click("text=Next Step")
                time.sleep(0.5)
                page.select_option("select", "UDSM")
                page.click("text=Next")
                time.sleep(0.5)
                # Use a NON-ADMIN number to avoid /admin redirect
                page.fill("input[placeholder='+255 700 000 000']", "+255 712 345 678")
                page.fill("input[type='password']", "123")
                page.click("button:has-text('Login')")
                page.wait_for_url("http://localhost:3000/")

            page.wait_for_load_state("networkidle")
            time.sleep(2) # Allow for Hero section animation

            # 2. Check Search Bar Size
            print("Checking Search Bar...")
            search_input = page.locator("input[placeholder*='Search notes']")
            if search_input.is_visible():
                box = search_input.bounding_box()
                print(f"Search Bar Height: {box['height']}")
                if box['height'] > 50:
                    print("SUCCESS: Search bar is larger.")
                else:
                    print(f"FAILURE: Search bar height is {box['height']}, expected > 50.")
            else:
                print("FAILURE: Search bar not found.")
                page.screenshot(path="verification/error_home.png")

            # Screenshot Home
            page.screenshot(path="verification/home_success.png")

            # 3. Check Ernest AI Tools
            print("Navigating to Ernest...")
            page.goto("http://localhost:3000/ernest")
            time.sleep(3) # Wait for component load

            # Check for Pro Mode
            if page.locator("text=Ready to study?").is_visible():
                 print("Ernest Pro is active.")

            # Check for new buttons
            if page.locator("button[title='Grammar Fix']").is_visible():
                 print("SUCCESS: Grammar Fix button found.")
            else:
                 print("FAILURE: Grammar Fix button not found.")
                 page.screenshot(path="verification/error_ernest.png")

            if page.locator("button[title='Summarize']").is_visible():
                 print("SUCCESS: Summarize button found.")
            else:
                 print("FAILURE: Summarize button not found.")

            if page.locator("text=Upload Img").is_visible():
                 print("SUCCESS: Upload Img button found.")
            else:
                 print("FAILURE: Upload Img button not found.")

            # Screenshot Ernest
            page.screenshot(path="verification/ernest_success.png")

        except Exception as e:
            print(f"Verification Failed: {e}")
            page.screenshot(path="verification/error_exception.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_ai_ui()
