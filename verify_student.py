from playwright.sync_api import sync_playwright

def verify_student_portal():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Attempt to visit the student portal or a public page
            print("Navigating to http://localhost:3000/student")
            page.goto("http://localhost:3000/student", timeout=60000)

            # Take a screenshot of whatever loads
            page.screenshot(path="verification_student.png")
            print("Screenshot saved to verification_student.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_student_portal()
