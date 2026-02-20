from playwright.sync_api import Page, expect, sync_playwright
import time

def test_orders_coupon_visibility(page: Page):
    print("Starting verification: Orders Coupon Visibility")

    # 1. Login (Using known test account)
    page.goto("http://localhost:5174/login")
    page.get_by_text("Next Step").click()
    page.locator("select").select_option("UDSM")
    page.get_by_text("Next").click()
    page.get_by_placeholder("+255 700 000 000").fill("0700000000")
    page.get_by_placeholder("Enter OTP (Simulated)").fill("123")
    page.get_by_role("button", name="Login").click()
    page.wait_for_selector("text=Essentials", timeout=15000)
    print("Logged in")

    # 2. Navigate to Orders
    page.goto("http://localhost:5174/orders")
    print("Navigated to Orders")

    # 3. Find an order with "Activate Pickup" (Should be present from mock data or auto-simulated logic)
    # The memory says "A global 3-second auto-simulation logic is implemented to automatically transition orders from PENDING to CONFIRMED"
    # So we should see a confirmed order with 'Activate Pickup' eventually.

    # Wait for the button. If mock data has it immediately, great.
    try:
        activate_btn = page.locator("button:has-text('Activate Pickup')").first
        activate_btn.wait_for(timeout=10000)
        print("Found Activate Pickup button")

        # 4. Click Activate
        activate_btn.click()
        print("Clicked Activate")

        # 5. Verify Modal Visibility
        # Look for "Live Ticket" or "Seconds Remaining"
        modal_text = page.locator("text=Live Ticket")
        modal_text.wait_for(state="visible", timeout=1000)
        print("Coupon Modal is Visible")

        # 6. Verify Timer Countdown (Check if text changes)
        timer = page.locator("text=Seconds Remaining").locator("..").locator("span").first
        initial_time = timer.text_content()
        time.sleep(1)
        new_time = timer.text_content()

        if initial_time != new_time:
            print(f"Timer is counting down: {initial_time} -> {new_time}")
        else:
            raise Exception("Timer is stuck!")

        # 7. Take Screenshot
        page.screenshot(path="verification/orders_coupon_visible.png")
        print("Screenshot saved")

    except Exception as e:
        print(f"Test failed: {e}")
        # If button not found, maybe create an order first? (Skipping for now as mock data usually has one)
        page.screenshot(path="verification/orders_fail.png")
        raise e

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use mobile viewport to test potential overflow issues
        context = browser.new_context(viewport={"width": 375, "height": 812})
        page = context.new_page()
        try:
            test_orders_coupon_visibility(page)
        finally:
            browser.close()
