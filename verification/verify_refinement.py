
from playwright.sync_api import sync_playwright
import time
import re

def verify_refinement():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # --- Merchant Flow ---
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        page.on("console", lambda msg: print(f"MERCHANT LOG: {msg.text}"))

        try:
            print("Navigating to Login (Merchant Flow)...")
            page.goto("http://localhost:3000/login")
            page.wait_for_load_state("networkidle")

            print("Logging in as Merchant...")
            page.click("text=Merchant")
            page.click("text=Next Step")
            page.select_option("select", "UDSM")
            page.click("button:has-text('Next')")

            page.fill("input[placeholder='+255 700 000 000']", "123456789")
            page.fill("input[type='password']", "123")
            page.click("button:has-text('Login')")

            print("Waiting for dashboard redirect...")
            try:
                page.wait_for_url(re.compile(r".*/merchant-dashboard"), timeout=10000)
            except Exception as e:
                 print(f"URL Wait Timeout. Current URL: {page.url}")
                 raise e

            page.wait_for_load_state("networkidle")
            print(f"Current URL: {page.url}")

            # Wait for textarea to appear
            try:
                page.wait_for_selector("textarea", timeout=10000)
                seo_area = page.locator("textarea").first
                if seo_area.is_visible():
                    print("SUCCESS: Large SEO Textarea found.")
                else:
                    print(f"FAILURE: SEO Textarea not found (visible check).")
            except:
                print(f"FAILURE: SEO Textarea not found (timeout).")

        except Exception as e:
            print(f"Merchant Verification Failed: {e}")
            page.screenshot(path="verification/error_merchant.png")
        finally:
            context.close()

        # --- Student Flow ---
        context2 = browser.new_context(viewport={'width': 1280, 'height': 800})
        page2 = context2.new_page()
        page2.on("console", lambda msg: print(f"STUDENT LOG: {msg.text}"))

        try:
            print("\nLogging in as Student...")
            page2.goto("http://localhost:3000/login")
            page2.click("text=Student")
            page2.click("text=Next Step")
            page2.select_option("select", "UDSM")
            page2.click("button:has-text('Next')")
            page2.fill("input[placeholder='+255 700 000 000']", "987654321")
            page2.fill("input[type='password']", "123")
            page2.click("button:has-text('Login')")

            print("Waiting for Home content...")
            try:
                # Wait for greeting text
                page2.wait_for_selector("text=Hello, Student", timeout=10000)
                print("SUCCESS: Home page greeting found.")
            except Exception as e:
                 print(f"Home Content Timeout. Current URL: {page2.url}")
                 print("Page Body Text Snippet:")
                 print(page2.inner_text("body")[:500])
                 page2.screenshot(path="verification/student_timeout.png")
                 raise e

            # Check Hero Search Bar
            print("Checking Hero Search Bar...")
            search_input = page2.locator("input[placeholder*='Search']").first

            if search_input.is_visible():
                box = search_input.bounding_box()
                print(f"Search Bar Height: {box['height']}")
                if box['height'] > 40:
                    print("SUCCESS: Search Bar confirmed.")
            else:
                print("FAILURE: Search Bar not found.")

            page2.screenshot(path="verification/home_green.png")

            # Check Ernest
            print("Navigating to Ernest...")
            page2.goto("http://localhost:3000/ernest")
            # Wait for button
            page2.wait_for_selector("text=Scan Handout", timeout=10000)
            print("SUCCESS: Scan Handout button found.")
            page2.screenshot(path="verification/ernest_green.png")

        except Exception as e:
            print(f"Student Verification Failed: {e}")
            page2.screenshot(path="verification/error_student.png")

        finally:
            browser.close()

if __name__ == "__main__":
    verify_refinement()
