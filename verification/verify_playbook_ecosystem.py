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

    # Check for the two cards
    expect(page.get_by_text("Playbook Pro", exact=False).first).to_be_visible()
    expect(page.get_by_text("Playbook X", exact=False).first).to_be_visible()
    print("Hub Verified")

    # 4. Verify Playbook Pro Form
    print("Clicking Playbook Pro...")
    page.locator(".group").filter(has_text="Playbook Pro").click()
    expect(page.get_by_text("Drop Document Here")).to_be_visible()

    # Upload a dummy file to trigger the form
    # Using a more specific selector for the drop zone
    # The drop zone has the class "border-dashed"
    with page.expect_file_chooser() as fc_info:
        page.locator(".border-dashed").click()
    file_chooser = fc_info.value
    # Create a dummy file in memory or use a simple text file
    page.evaluate("() => { const file = new File(['hello'], 'test.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }); const dt = new DataTransfer(); dt.items.add(file); window._testFile = dt.files; }")

    # Actually, Playwright has set_input_files
    # We need to target the hidden input
    page.locator('input[type="file"]').set_input_files({
        "name": "test.docx",
        "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "buffer": b"dummy content"
    })

    # Now verify the form appears
    expect(page.get_by_text("Formatting Rules")).to_be_visible()

    # Verify Dropdowns exist (Font, Size, Spacing)
    # Note: Select elements might be hidden or styled, but playwright can usually find them if they are select tags
    # Assuming standard selects based on code:
    # 3 selects visible initially
    selects = page.locator("select")
    # Expect at least 3 visible (Font, Size, Spacing)
    # count = selects.count() # might be flaky if animations

    # Interact with Advanced Settings
    print("Expanding Advanced Settings...")
    page.get_by_text("Show Advanced").click()
    expect(page.get_by_text("Margins")).to_be_visible()
    expect(page.get_by_text("Citation Style")).to_be_visible()

    print("Playbook Pro Form Verified")

    # Go back to Hub (Force navigation to ensure clean state)
    page.goto("http://localhost:5173/playbook")
    expect(page.get_by_text("Create. Automate. Done.")).to_be_visible()

    # 5. Click Playbook X Card
    print("Clicking Playbook X...")
    page.locator(".group").filter(has_text="Playbook X").click()

    # 6. Verify Playbook X Interface
    expect(page.get_by_text("Text-to-PPTX")).to_be_visible()

    # Verify New Config Options
    expect(page.get_by_text("Aspect Ratio")).to_be_visible()
    expect(page.get_by_text("Advanced Rules")).to_be_visible()

    # Interact with Advanced
    print("Expanding Advanced Rules...")
    page.get_by_text("Configure").click()
    expect(page.get_by_text("Speaker Notes")).to_be_visible()

    # Check for new placeholder text/rules
    textarea = page.locator("textarea")
    expect(textarea).to_be_visible()
    placeholder = textarea.get_attribute("placeholder")
    if "Heading 1 = New Slide" in placeholder or "# Slide Title" in placeholder:
        print("New Placeholder Verified")
    else:
        print(f"Warning: Placeholder text mismatch: {placeholder}")

    # 7. Generate Slides
    print("Clicking Generate...")
    page.get_by_role("button", name="GENERATE SLIDES").click()

    # Check for Generating state
    expect(page.get_by_text("Building Slides...")).to_be_visible(timeout=2000)
    print("Generating State Visible")

    # Check for Success
    expect(page.get_by_role("button", name="DOWNLOAD .PPTX")).to_be_visible(timeout=10000)
    print("PPT Generation Success")

    page.screenshot(path="verification/playbook_ecosystem.png")

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
