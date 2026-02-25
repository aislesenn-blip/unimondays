from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000/login")
        # Wait for hydration or content
        try:
            page.wait_for_selector('text=Log in to your account', timeout=5000)
        except:
            print("Timeout waiting for login text, taking screenshot anyway")

        page.screenshot(path="verification/login_page.png")
        browser.close()

if __name__ == "__main__":
    run()
