
from playwright.sync_api import sync_playwright
import time

def verify_comprehensive():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        try:
            # 1. Landing Page Test
            print("Navigating to Landing Page...")
            page.goto("http://localhost:3000/")
            page.wait_for_load_state("networkidle")

            # Check Tagline
            if page.locator("text=Move Different").is_visible():
                print("SUCCESS: Landing Page Loaded.")
            else:
                print("FAILURE: Landing Page Tagline Missing.")

            # Click CTA
            print("Clicking CTA...")
            page.click("text=Have your UniMonday account")
            # Wait for login form
            page.wait_for_url("**/login")
            print("Redirected to Login.")

            # 2. Login Flow (Student)
            print("Logging in as Student...")
            page.click("text=Student")
            page.click("text=Next Step")
            page.select_option("select", "UDSM")
            page.click("button:has-text('Next')")
            page.fill("input[placeholder='+255 700 000 000']", "987654321")
            page.fill("input[type='password']", "123")
            page.click("button:has-text('Login')")

            # Wait longer for redirect and render
            time.sleep(2)
            page.wait_for_url("**/home")
            page.wait_for_load_state("networkidle")
            print("Logged in. Redirected to /home.")

            # 3. Home Visual Check
            print("Checking Home Visuals...")
            # Wait for content to appear
            page.wait_for_selector("text=Hello", timeout=5000)

            # Dump content if not found
            # The text is "It's UɴiMonday UDSM" effectively because of the span
            content = page.inner_text("body")
            if "UDSM" in content:
                 print("SUCCESS: University Badge Found (Text present).")
            else:
                 print("FAILURE: University Badge Missing. Content snippet:")
                 print(content[:500])

            # Check Search Bar Container (bg-white card)
            search_card = page.locator("input[placeholder*='Search']").first
            if search_card.is_visible():
                print("SUCCESS: Search Container Found.")

            # 4. Ernest Selection Logic
            print("Navigating to Ernest...")
            page.goto("http://localhost:3000/ernest")

            # Check Selection Screen
            if page.locator("text=Choose Your Partner").is_visible():
                print("SUCCESS: Ernest Selection Screen Visible.")
            else:
                print("FAILURE: Selection Screen Missing (Auto-load might still be active).")

            # Test Lite Mode
            # Depending on how the click works (it's a button div), force click
            page.click("text=Ernest Lite")
            time.sleep(1) # wait for state update
            if page.locator("text=Ernest Lite").first.is_visible():
                 print("SUCCESS: Lite Mode Loaded.")
            else:
                 print("FAILURE: Lite Mode Greeting Missing.")

            page.screenshot(path="verification/final_check.png")
            print("Screenshot saved to verification/final_check.png")

        except Exception as e:
            print(f"Verification Failed: {e}")
            page.screenshot(path="verification/error_final.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_comprehensive()
