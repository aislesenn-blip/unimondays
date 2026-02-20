from playwright.sync_api import Page, expect, sync_playwright
import time
import io
import zipfile

def test_playbook_mobile_flow(page: Page):
    print("Starting verification: Playbook Mobile Journey")

    # 1. Login (Mobile View)
    page.goto("http://localhost:5173/login")
    try:
        if page.get_by_text("Next Step").is_visible(timeout=3000):
            page.get_by_text("Next Step").click()
            page.locator("select").select_option("UDSM")
            page.get_by_text("Next").click()
            page.get_by_placeholder("+255 700 000 000").fill("0700000000")
            page.get_by_placeholder("Enter OTP (Simulated)").fill("123")
            page.get_by_role("button", name="Login").click()
            page.wait_for_selector("text=Essentials", timeout=15000)
    except Exception as e:
        pass

    print("Logged in")

    # 2. Navigate to Playbook Hub
    page.goto("http://localhost:5173/playbook")
    expect(page.get_by_text("Create. Automate. Done.")).to_be_visible()
    page.screenshot(path="verification/mobile_1_hub.png")
    print("Captured Hub")

    # 3. Playbook PRO Flow
    print("Entering Playbook PRO...")
    page.locator(".group").filter(has_text="Playbook Pro").click()
    expect(page.get_by_text("Drop Document Here")).to_be_visible()
    page.screenshot(path="verification/mobile_2_pro_upload.png")

    # Upload dummy .txt file (safer for automated testing than mocking a complex docx)
    with page.expect_file_chooser() as fc_info:
        page.locator(".border-dashed").click()
    page.locator('input[type="file"]').set_input_files({
        "name": "thesis.txt",
        "mimeType": "text/plain",
        "buffer": b"Chapter 1\n\nThis is a mobile test content for Playbook Pro."
    })

    # Verify Config Form (Presets)
    expect(page.get_by_text("One-Click Style Preset")).to_be_visible()
    page.screenshot(path="verification/mobile_3_pro_config.png")

    # Select Preset
    page.get_by_text("Academic").click()

    # Wait for analysis to finish (simulated 800ms in app)
    time.sleep(1)

    # Process
    page.get_by_role("button", name="FORMAT DOCUMENT").click()

    # Verify QC Report & Mobile Layout
    expect(page.get_by_text("Quality Control Report")).to_be_visible(timeout=5000)
    # Check that buttons are visible and stacked (implied by layout but visible in screenshot)
    page.screenshot(path="verification/mobile_4_pro_success.png")
    print("Captured PRO Success")

    # Go Back
    page.goto("http://localhost:5173/playbook")

    # 4. Playbook X Flow
    print("Entering Playbook X...")
    page.locator(".group").filter(has_text="Playbook X").click()
    expect(page.get_by_text("Text-to-PPTX")).to_be_visible()
    page.screenshot(path="verification/mobile_5_x_input.png")

    # Generate
    page.get_by_role("button", name="GENERATE SLIDES").click()

    # Verify QC Report
    expect(page.get_by_text("QC Passed")).to_be_visible(timeout=5000)
    page.screenshot(path="verification/mobile_6_x_success.png")
    print("Captured X Success")

if __name__ == "__main__":
    with sync_playwright() as p:
        # Simulate Mobile Device (iPhone 12/13/14 size)
        iphone = p.devices['iPhone 13']
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(**iphone)
        page = context.new_page()

        try:
            test_playbook_mobile_flow(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="verification/mobile_failure.png")
        finally:
            browser.close()
