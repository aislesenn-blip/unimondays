from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        try:
            # 1. Landing Page
            print("Navigating to Landing Page...")
            page.goto("http://localhost:3000/")
            page.wait_for_load_state("networkidle")

            # Verify text
            if page.is_visible("text='On-Demand Campus Services'"):
                print("Verified: 'On-Demand Campus Services' is visible.")
            else:
                print("Error: 'On-Demand Campus Services' not found.")

            if page.is_visible("text='Playbook'"):
                print("Verified: 'Playbook' is visible.")
            else:
                print("Error: 'Playbook' not found.")

            page.screenshot(path="verification/landing_v2.png")
            print("Screenshot saved: verification/landing_v2.png")

            # 2. Login Flow
            print("Navigating to Login...")
            page.goto("http://localhost:3000/login")
            page.wait_for_load_state("networkidle")

            # Step 1: Role
            print("Selecting Role...")
            page.click("text='Student'")
            page.click("button:has-text('Next Step')")
            time.sleep(1)

            # Step 2: University
            print("Selecting University...")
            page.select_option("select", "UDSM")
            page.click("button:has-text('Next')")
            time.sleep(1)

            # Step 3: Credentials
            print("Entering Credentials...")
            page.get_by_placeholder("+255 700 000 000").fill("0700000000")
            page.get_by_placeholder("Enter OTP (Simulated)").fill("123")
            page.click("button:has-text('Login')")

            # Wait for Home
            print("Waiting for Home...")
            page.wait_for_url("**/home")
            print("Logged in, redirected to Home.")
            page.wait_for_load_state("networkidle")
            time.sleep(2) # Extra wait for animations

            # 3. Verify Home
            print("Verifying Home...")
            if page.is_visible("text='Playbook'") and page.is_visible("text='Dining'") and page.is_visible("text='Print'") and page.is_visible("text='Travel'"):
                 print("Verified: Essentials buttons visible.")
            else:
                 print("Error: Essentials buttons missing.")

            page.screenshot(path="verification/home_v2.png")
            print("Screenshot saved: verification/home_v2.png")

            # 4. Verify Dining
            print("Clicking Dining...")
            page.click("text='Dining'")
            page.wait_for_url("**/dining")
            # Wait for title
            page.wait_for_selector("h1:has-text('Dining')")
            page.screenshot(path="verification/dining_v2.png")
            print("Screenshot saved: verification/dining_v2.png")

            # 5. Verify Playbook
            print("Going back to Home...")
            page.goto("http://localhost:3000/home") # Use direct nav to be safe
            page.wait_for_load_state("networkidle")

            print("Clicking Playbook...")
            page.click("text='Playbook'")
            page.wait_for_url("**/playbook")
            page.wait_for_selector("text='Choose Your Partner'")
            page.screenshot(path="verification/playbook_v2.png")
            print("Screenshot saved: verification/playbook_v2.png")

        except Exception as e:
            print(f"An error occurred: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
