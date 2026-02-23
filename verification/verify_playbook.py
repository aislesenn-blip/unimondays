from playwright.sync_api import sync_playwright

def verify_playbook():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Desktop Viewport
        page = browser.new_page(viewport={"width": 1440, "height": 900})

        print("Navigating to Home...")
        try:
            page.goto("http://localhost:3000")
            page.wait_for_selector("text=Assessment Infrastructure", timeout=10000)
            page.wait_for_timeout(1000) # Wait for animations
            page.screenshot(path="verification/home.png")
            print("Home screenshot taken.")

            print("Navigating to Student Dashboard...")
            # Click the Student Account link
            # Selector might need adjustment
            page.get_by_role("link", name="Student Account").click()
            page.wait_for_selector("text=Student Access Layer", timeout=5000)
            page.wait_for_timeout(1000)
            page.screenshot(path="verification/student_login.png")
            print("Student Login screenshot taken.")

            print("Navigating to Lecturer Dashboard...")
            page.goto("http://localhost:3000/lecturer/dashboard")
            page.wait_for_selector("text=Dashboard", timeout=5000)
            page.wait_for_timeout(1000)
            page.screenshot(path="verification/lecturer_dashboard.png")
            print("Lecturer Dashboard screenshot taken.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_playbook()
