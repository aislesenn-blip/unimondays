from playwright.sync_api import sync_playwright

def verify_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile view first
        context = browser.new_context(viewport={'width': 375, 'height': 812})
        page = context.new_page()

        # 1. Login Page
        print("Navigating to Login Page...")
        page.goto("http://localhost:5173/login")
        page.wait_for_selector("text=Welcome back")
        page.screenshot(path="verification/01_login.png")

        # 2. Login as Student
        print("Logging in as Student...")
        # Use specific placeholder matching
        page.fill("input[placeholder='+255 700 000 000']", "+1234567890")
        page.click("button:has-text('Continue')")

        # Verify Home
        print("Verifying Home Page...")
        page.wait_for_url("http://localhost:5173/")
        page.wait_for_selector("text=Hello,")
        page.screenshot(path="verification/02_home.png")

        # 3. Marketplace
        print("Navigating to Marketplace...")
        # Target the bottom nav link specifically (it's inside a nav with fixed bottom)
        # Using a more robust locator strategy: get by role link with name 'Market' or 'Marketplace'
        # Or look for the link inside the bottom nav
        page.click("nav.fixed.bottom-0 a[href='/marketplace']")
        page.wait_for_url("http://localhost:5173/marketplace")
        page.wait_for_selector("text=Marketplace")
        page.wait_for_selector(".grid")
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/03_marketplace.png")

        # 4. Ernest Lite (Search)
        print("Navigating to Ernest...")
        page.click("nav.fixed.bottom-0 a[href='/ernest']")
        page.wait_for_url("http://localhost:5173/ernest")

        # Verify Data Guard Logic (Simulated WiFi download starts automatically)
        print("Verifying Smart Data Guard & Lite Mode...")
        # It might happen fast, so we might miss "Downloading", but let's try to catch it or the result
        try:
            page.wait_for_selector("text=Downloading Intelligence", timeout=5000)
            page.screenshot(path="verification/04a_ernest_downloading.png")
        except:
            print("Download started/finished too fast or missed.")

        # Wait for download to finish and Offline Ready badge
        page.wait_for_selector("text=OFFLINE READY", timeout=20000)
        page.screenshot(path="verification/04b_ernest_ready.png")

        # Test Search (Lite Mode) - Ensure we are in Lite Mode
        print("Testing Ernest Lite Search...")
        # Just to be sure, click Lite Search if not active (default is Lite)

        page.fill("input[placeholder*='Search']", "Wali") # Should find Rice
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/04c_ernest_search_results.png")

        # 5. Ernest Pro (AI Studio)
        print("Switching to AI Studio...")
        page.click("button:has-text('AI Studio')")
        page.wait_for_selector("text=Ready to study?")

        # Test Tools
        print("Testing Quiz Me Tool...")
        page.click("button[title='Quiz Me']")
        # Wait for simulated response (1.5s delay in code)
        page.wait_for_timeout(2000)
        page.screenshot(path="verification/05_ernest_pro.png")

        # 6. Profile
        print("Navigating to Profile...")
        page.click("nav.fixed.bottom-0 a[href='/profile']")
        page.wait_for_selector("text=Profile")
        page.screenshot(path="verification/06_profile.png")

        browser.close()
        print("Verification Complete!")

if __name__ == "__main__":
    verify_app()
