from playwright.sync_api import sync_playwright

def verify_student_results():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3001/student/MATH-401/results")

        # Wait for loading
        page.wait_for_selector("text=Midterm Examination Phase 1", timeout=10000)

        # Take screenshot
        page.screenshot(path="student-results-page.png", full_page=True)

        print("Student results page screenshot captured.")
        browser.close()

verify_student_results()
