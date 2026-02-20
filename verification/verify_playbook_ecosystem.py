from playwright.sync_api import Page, expect, sync_playwright
import time

def test_playbook_ecosystem(page: Page):
    print("Starting verification: Playbook Ecosystem")

    page.on("dialog", lambda dialog: print(f"Dialog opened: {dialog.message}"))
    page.on("console", lambda msg: print(f"Console: {msg.text}"))

    # 1. Login
    page.goto("http://localhost:5173/login")
    try:
        # Check if we are already logged in or need to go through onboarding
        if page.get_by_text("Next Step").is_visible(timeout=3000):
            print("Going through onboarding...")
            page.get_by_text("Next Step").click()
            page.locator("select").select_option("UDSM")
            page.get_by_text("Next").click()
            page.get_by_placeholder("+255 700 000 000").fill("0700000000")
            page.get_by_placeholder("Enter OTP (Simulated)").fill("123")
            page.get_by_role("button", name="Login").click()
            page.wait_for_selector("text=Essentials", timeout=15000)
    except Exception as e:
        print(f"Login skip/error: {e}")
        pass

    print("Logged in")

    # 2. Navigate to Playbook
    page.goto("http://localhost:5173/playbook")
    print("Navigated to Playbook")

    # 3. Verify Playbook Hub
    expect(page.get_by_text("Create. Automate. Done.")).to_be_visible()
    print("Hub Verified")

    # 4. Verify Playbook Pro Form & Presets
    print("Clicking Playbook Pro...")
    page.locator(".group").filter(has_text="Playbook Pro").click()
    expect(page.get_by_text("Drop Document Here")).to_be_visible()

    # Upload a dummy file to trigger the form
    with page.expect_file_chooser() as fc_info:
        page.locator(".border-dashed").click()
    # Create a dummy file input (Minimal valid DOCX)
    import io
    import zipfile

    docx_buffer = io.BytesIO()
    with zipfile.ZipFile(docx_buffer, 'w') as zf:
        zf.writestr('[Content_Types].xml', b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/></Types>')
        zf.writestr('_rels/.rels', b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>')
        zf.writestr('word/document.xml', b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello World</w:t></w:r></w:p></w:body></w:document>')

    page.locator('input[type="file"]').set_input_files({
        "name": "test.docx",
        "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "buffer": docx_buffer.getvalue()
    })

    # Now verify the form appears with Presets
    expect(page.get_by_text("One-Click Style Preset")).to_be_visible()

    # Click a Preset
    print("Selecting Academic Preset...")
    page.get_by_text("Academic", exact=True).click()

    # Process
    print("Clicking Format Document...")
    page.get_by_role("button", name="FORMAT DOCUMENT").click()

    # Wait for QC Report
    expect(page.get_by_text("Quality Control Report")).to_be_visible(timeout=5000)
    print("QC Report Verified")

    # Check for Output Buttons
    expect(page.get_by_role("button", name=".DOCX")).to_be_visible()
    expect(page.get_by_role("button", name=".PDF")).to_be_visible()
    print("Output Buttons Verified")

    print("Playbook Pro Flow Verified")

    # Go back to Hub
    page.goto("http://localhost:5173/playbook")
    expect(page.get_by_text("Create. Automate. Done.")).to_be_visible()

    # 5. Click Playbook X Card
    print("Clicking Playbook X...")
    page.locator(".group").filter(has_text="Playbook X").click()

    # 6. Verify Playbook X Interface & Buttons
    expect(page.get_by_text("Text-to-PPTX")).to_be_visible()

    # Generate Slides
    print("Clicking Generate...")
    page.get_by_role("button", name="GENERATE SLIDES").click()

    # Check for QC Report & Buttons
    expect(page.get_by_text("QC Passed")).to_be_visible(timeout=5000)
    expect(page.get_by_role("button", name="PPTX")).to_be_visible()
    expect(page.get_by_role("button", name="PDF")).to_be_visible()
    expect(page.get_by_role("button", name="Download Handouts")).to_be_visible()

    print("Playbook X Flow Verified")

    page.screenshot(path="verification/playbook_final.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        try:
            test_playbook_ecosystem(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="verification/failure.png")
        finally:
            browser.close()
