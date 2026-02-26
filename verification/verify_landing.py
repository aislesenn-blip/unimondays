from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Wait for Next.js to start
        try:
            page.goto("http://localhost:3000", timeout=60000)
            # Wait for key text to appear to ensure loading
            page.wait_for_selector("text=Intelligent Grading Assistance", timeout=60000)

            # Take screenshot of the top part
            page.screenshot(path="verification/landing_hero.png")

            # Scroll down to features and take another screenshot
            page.evaluate("window.scrollTo(0, 1000)")
            page.wait_for_timeout(1000) # Wait for potential animations
            page.screenshot(path="verification/landing_features.png")

            print("Screenshots taken successfully.")
        except Exception as e:
            print(f"Error: {e}")
            # Take screenshot even on error if possible
            try:
                page.screenshot(path="verification/error.png")
            except:
                pass
        finally:
            browser.close()

if __name__ == "__main__":
    run()
