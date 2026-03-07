from playwright.sync_api import sync_playwright

def verify_student_portal():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # Navigate to the student portal where the submission drawer and list are rendered
            print("Navigating to student portal...")
            page.goto("http://localhost:3000/student")

            # Wait for the UI to load
            page.wait_for_timeout(2000)

            print("Taking screenshot...")
            page.screenshot(path="verification_student.png", full_page=True)
            print("Screenshot saved to verification_student.png")

        except Exception as e:
            print(f"Error during verification: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_student_portal()