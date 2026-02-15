
from playwright.sync_api import sync_playwright
import time

def verify_premium_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        try:
            # 1. Login and Check Branding
            print("Navigating to Login...")
            page.goto("http://localhost:3000/login")
            page.wait_for_load_state("networkidle")

            # Check Branding Text
            branding = page.locator("h1").first.text_content()
            print(f"Branding Text Found: {branding}")
            # The 'N' might be uppercase or special char depending on implementation
            if "Monday" in branding:
                 print("SUCCESS: Branding text found.")
            else:
                 print("FAILURE: Branding not found. Content: " + branding)

            # Check Background Color
            bg_color = page.evaluate("window.getComputedStyle(document.body).backgroundColor")
            print(f"Body Background Color: {bg_color}")
            # slate-50 is roughly #f8fafc -> rgb(248, 250, 252)
            if "248, 250, 252" in bg_color or "255, 255, 255" in bg_color:
                print("SUCCESS: Light mode background detected.")
            else:
                print(f"WARNING: Background might not be slate-50. Value: {bg_color}")

            # Login as Student
            print("Logging in...")
            if page.locator("text=Student").is_visible():
                page.click("text=Student")
                if page.locator("text=Next Step").is_visible():
                    page.click("text=Next Step")
                time.sleep(0.5)
                page.select_option("select", "UDSM")
                page.click("text=Next")
                time.sleep(0.5)
                page.fill("input[placeholder='+255 700 000 000']", "+255 712 345 678")
                page.fill("input[type='password']", "123")
                page.click("button:has-text('Login')")
                page.wait_for_url("http://localhost:3000/")

            page.wait_for_load_state("networkidle")
            time.sleep(2) # Allow for Hero section animation

            # 2. Check Floating Search Bar
            print("Checking Search Bar...")
            search_input = page.locator("input[placeholder*='Search notes']")
            if search_input.is_visible():
                # Check if it has white background class logic via computed style
                input_bg = search_input.evaluate("el => window.getComputedStyle(el).backgroundColor")
                print(f"Search Bar BG: {input_bg}")

                if "255, 255, 255" in input_bg:
                    print("SUCCESS: Search bar is white.")
                else:
                    print("FAILURE: Search bar is not white.")

                # Check rounded corners (2xl is usually 16px)
                radius = search_input.evaluate("el => window.getComputedStyle(el).borderRadius")
                print(f"Search Bar Radius: {radius}")

            else:
                print("FAILURE: Search bar not found.")

            # Screenshot Home
            page.screenshot(path="verification/home_light.png")
            print("Screenshot saved: verification/home_light.png")

            # 3. Check Cards Style
            print("Checking Card Styles...")
            first_card = page.locator(".group").first # Assuming card has group class
            # Just verify it exists for now, visual check via screenshot is better

            # 4. Check Ernest
            print("Navigating to Ernest...")
            page.goto("http://localhost:3000/ernest")
            time.sleep(2)
            page.screenshot(path="verification/ernest_light.png")
            print("Screenshot saved: verification/ernest_light.png")

        except Exception as e:
            print(f"Verification Failed: {e}")
            page.screenshot(path="verification/error_light.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_premium_ui()
