from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        try:
            print("--- NOTICES VERIFICATION ---")
            print("1. Logging in as HOD to post a notice...")
            page.goto("http://localhost:3000/login")
            page.click("text=HOD")
            page.wait_for_url("**/dashboard/hod")

            # Go to Notices
            print("2. Navigating to Notices...")
            # HOD dashboard has "Department Notices" card, but sidebar link is best
            page.click("a[href='/notices']")
            page.wait_for_url("**/notices")

            print("3. Posting a Notice targeting STAFF...")
            page.click("text=New Notice")
            page.fill("input[placeholder='e.g. Monthly Meeting']", "Urgent Staff Meeting")
            page.fill("textarea", "Mandatory attendance required.")

            # Ensure STAFF is selected (default) or select it
            # The button for STAFF should be active by default in my code?
            # State default is ['STAFF']. Let's keep it.

            page.click("text=Post Notice")
            time.sleep(1)
            page.screenshot(path="verification/06_hod_posted_notice.png")

            print("4. Logging out...")
            page.locator("header button").last.click()
            page.wait_for_url("**/login")

            print("5. Logging in as STAFF to view notice...")
            page.click("text=STAFF")
            page.wait_for_url("**/dashboard/staff")

            # Staff dashboard should show unread notice count or notice itself
            page.screenshot(path="verification/07_staff_dashboard_notice.png")

            print("6. Going to Notices page as STAFF...")
            page.click("a[href='/notices']")
            page.wait_for_url("**/notices")

            # Verify notice is present
            if page.locator("text=Urgent Staff Meeting").count() > 0:
                print("   SUCCESS: Notice is visible to Staff.")
            else:
                print("   FAILURE: Notice NOT found.")

            print("7. Marking as Read...")
            page.click("text=Mark as Read")
            time.sleep(1)
            page.screenshot(path="verification/08_staff_read_notice.png")

            print("--- VAULT VERIFICATION ---")
            print("8. Logging out...")
            page.locator("header button").last.click()

            print("9. Logging in as SECRETARY to upload confidential doc...")
            page.click("text=SECRETARY")
            page.wait_for_url("**/dashboard/secretary")

            # Go to Vault
            page.click("a[href='/vault']")
            page.wait_for_url("**/vault")

            print("10. Uploading Confidential Document...")
            page.click("text=Upload Document")
            page.fill("input[placeholder='e.g. Q4 Budget Report']", "Secret Budget 2024")
            # Select Confidential
            page.check("#confidential")
            page.click("text=Upload & Archive")
            time.sleep(1)
            page.screenshot(path="verification/09_sec_uploaded_confidential.png")

            print("11. Logging out...")
            page.locator("header button").last.click()

            print("12. Logging in as STAFF (Should NOT see document)...")
            page.click("text=STAFF")
            page.wait_for_url("**/dashboard/staff")
            page.click("a[href='/vault']")

            # Verify document is NOT visible
            if page.locator("text=Secret Budget 2024").count() == 0:
                 print("   SUCCESS: Confidential document is hidden from Staff.")
            else:
                 print("   FAILURE: Staff can see confidential document!")

            page.screenshot(path="verification/10_staff_vault_empty.png")

            print("13. Logging out...")
            page.locator("header button").last.click()

            print("14. Logging in as COMMITTEE (Should see document)...")
            page.click("text=COMMITTEE")
            # Committee login button text might be "Exam Committee" based on mock data?
            # MockData: name="Exam Committee", role="COMMITTEE". Button shows role "COMMITTEE".
            # Login page maps over MOCK_USERS. Button text includes role.

            page.wait_for_url("**/dashboard/committee")
            page.click("a[href='/vault']")

            if page.locator("text=Secret Budget 2024").count() > 0:
                 print("   SUCCESS: Committee can see confidential document.")
            else:
                 print("   FAILURE: Committee cannot see document!")

            page.screenshot(path="verification/11_committee_vault_visible.png")

            print("Done.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_extra.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
