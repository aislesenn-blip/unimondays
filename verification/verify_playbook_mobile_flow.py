from playwright.sync_api import Page, expect, sync_playwright
import time

def test_playbook_mobile_flow(page: Page):
    print("Starting verification: Playbook Mobile Journey")

    page.on("dialog", lambda dialog: print(f"Dialog opened: {dialog.message}"))
    page.on("console", lambda msg: print(f"Console: {msg.text}"))

    # 1. Login
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
        print(f"Login skip/error: {e}")
        pass

    print("Logged in")

    # 2. Navigate to Playbook Hub
    page.goto("http://localhost:5173/playbook")
    expect(page.get_by_text("Create. Automate. Done.")).to_be_visible()
    print("Captured Hub")

    # 3. Playbook PRO Flow (Document)
    print("Entering Playbook PRO...")
    page.locator(".group").filter(has_text="Playbook Pro").click()
    expect(page.get_by_text("Upload Document")).to_be_visible()

    # Upload dummy .txt
    with page.expect_file_chooser() as fc_info:
        page.locator(".border-dashed").click()
    page.locator('input[type="file"]').set_input_files({
        "name": "thesis.txt",
        "mimeType": "text/plain",
        "buffer": b"Chapter 1\n\nThis is a mobile test content for Playbook Pro."
    })

    # Verify Bucket Selection
    print("Verifying Buckets...")
    expect(page.get_by_text("What are you making?")).to_be_visible()

    # Select Research
    page.get_by_text("Research Paper").click()

    # Verify Editor
    print("Verifying Editor...")
    expect(page.get_by_text("Playbook Editor")).to_be_visible()
    expect(page.get_by_text("Editing: RESEARCH")).to_be_visible()
    # Check for Toolbar items
    expect(page.locator("button[title='Align Left']")).to_be_visible()

    # Process
    print("Generating...")
    page.get_by_role("button", name="GENERATE").click()

    # Verify Success
    expect(page.get_by_text("Ready to Submit")).to_be_visible(timeout=10000)
    expect(page.get_by_text("QC Summary")).to_be_visible()
    print("Captured PRO Success")

    # Go Back / Reset
    page.goto("http://localhost:5173/playbook")

    # 4. Playbook PRO Flow (PPT)
    print("Entering Playbook PRO for PPT...")
    page.locator(".group").filter(has_text="Playbook Pro").click()

    # Upload again
    with page.expect_file_chooser() as fc_info:
        page.locator(".border-dashed").click()
    page.locator('input[type="file"]').set_input_files({
        "name": "presentation.txt",
        "mimeType": "text/plain",
        "buffer": b"# Slide 1\nContent"
    })

    # Select Presentation Bucket
    print("Selecting Presentation Bucket...")
    expect(page.get_by_text("What are you making?")).to_be_visible()
    page.get_by_text("Presentation").click()

    # Check Editor specific to PPT (GENERATE SLIDES button text change in Editor?)
    # My code: {status === 'editor' && ( <Button ...> {bucket === 'ppt' ? 'GENERATE SLIDES' : 'GENERATE DOC'} </Button> )}
    expect(page.get_by_role("button", name="GENERATE SLIDES")).to_be_visible()

    # Generate
    print("Generating Slides...")
    page.get_by_role("button", name="GENERATE SLIDES").click()

    # Verify Success and PPTX button
    expect(page.get_by_text("Ready to Submit")).to_be_visible(timeout=10000)
    expect(page.get_by_role("button", name=".PPTX")).to_be_visible()
    print("Captured PPT Success")

    page.screenshot(path="verification/playbook_final_flow.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Mobile viewport
        context = browser.new_context(viewport={"width": 375, "height": 667})
        page = context.new_page()
        try:
            test_playbook_mobile_flow(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="verification/failure.png")
        finally:
            browser.close()
